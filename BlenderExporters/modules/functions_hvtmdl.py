#functions for writing a hvtmdl

import bpy, bpy_extras.node_shader_utils
#import Blender
#import BPyMessages
#from Blender import Modifier
import os, math, shutil, sys
from mathutils import Vector

def vec3NewScalar( s ):
	return Vector([ s, s, s ])
def vec3Min( v1, v2 ):
	v1[0] = v1[0] if v1[0] < v2[0] else v2[0]
	v1[1] = v1[1] if v1[1] < v2[1] else v2[1]
	v1[2] = v1[2] if v1[2] < v2[2] else v2[2]
def vec3Max( v1, v2 ):
	v1[0] = v1[0] if v1[0] > v2[0] else v2[0]
	v1[1] = v1[1] if v1[1] > v2[1] else v2[1]
	v1[2] = v1[2] if v1[2] > v2[2] else v2[2]

def popupMenu(message):
    bpy.context.window_manager.popup_menu(lambda self, \
    context: self.layout.label(text=message), title='Error', icon='ERROR' )

#asset directory is the dir that contains the folders meshes, animations, ..etc.
def writeModel(assetDirectory, ob):
    """Write a HavenTech mesh and animation file from the current blender
    scene, returns the Axis aligned bounding box min and max vect3's for
    inital adding to the haven scene oct tree"""

    #check the user has selected an object
    if not ob:
        print('Error%t| write model called with null ob')
        return
    #check that the selected object is a Mesh
    if not ob.type == 'MESH':
        print('Error%t| Active object is not a Mesh')
        return

    #----write the mesh file----
    #---------------------------
    [AABBMin, AABBMax] = writeMesh(assetDirectory, ob)

    #----write the mesh materials file----
    #-------------------------------------
    writeMeshMaterials(assetDirectory, ob)

    #----write the keyframes file----
    #--------------------------------
    writeKeyframeMeshData(assetDirectory, ob)

    #----write the anim file----
    #---------------------------
    writeAnim(assetDirectory, ob)
    
    #apply object location, rotation and scale to AABB
    AABBmin = ob.matrix_world @ AABBMin
    AABBmax = ob.matrix_world @ AABBMax
    
    return [AABBmin, AABBmax]

def writeMeshMaterials(assetDirectory, ob):
    """Write a materials file, and a haven tech material file for each of the
    materials associated with the given mesh object"""

    #check that the mesh only uses its own materials (and not materials of its
    #parent object)
    #if(ob.colbits != 0):
    #    Blender.Draw.PupMenu('Error%t| Mesh object: ' + ob.name + \
    #            ' uses Parent Object materials' + ' (colbits != 0)')
    #    return

    #get the mesh
    mesh = ob.data
    #check that geting the mesh data worked
    if not mesh:
        print('Error%t| writeMeshMaterials Can\'t get mesh data for obj: ' + ob.name)
        return

    matFileName = assetDirectory + "/meshMaterials/" + ob.name + ".hvtMeshMat"
    
    #open the output file
    out = open(matFileName, "w")

    for mat in mesh.materials:
        #write a line in the hvtmeshmat file
        print( 'material %s' % (mat.name) )
        out.write( 'mat %s\n' % (mat.name))
        #write a hvtMat file for the material
        writeMaterial(assetDirectory, mat)
    out.close()

def writeMaterial(assetDirectory, mat):
    """Write a hvtMat file for the given blender material:
    	principledBDSF values and texture names the material uses"""

    matFileName = assetDirectory + "/materials/" + mat.name + ".hvtMat"
    print("writeMaterial matFileName %s" % (matFileName) )
    
    #example of walking material node graph and getting  
    #bpy.context.scene.objects[17].data.materials[0].node_tree.nodes[0].inputs['Surface'].node
    #>bpy.data.materials['metal'].node_tree.nodes["Material Output"]

    #check that the shader is of type Principled BSDF
    #to keep the haven exporter from blender simple it only supports this shader type because it can do plastic, metal, and transparent materials
    #https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html
    #"The base layer is a user controlled mix between diffuse, metal, subsurface scattering and transmission. On top of that there is a specular layer, sheen layer and clearcoat layer."
    principledBsdfCount = mat.node_tree.nodes.keys().count('Principled BSDF')
    print( 'Principled BSDF count %i' % (principledBsdfCount) )
    if principledBsdfCount < 1:
        print("Haven Exporter unsupported material - Principled BSDF node not found for material: %s" % (mat.name) )
        return
        
    p = bpy_extras.node_shader_utils.PrincipledBSDFWrapper(mat)

    #open the output file
    out = open(matFileName, "w")
    
    #print( "writeShader: %s" % (mat.name) ) 
    

    #output the textures the Material uses
    ####################################
    diffuseTextureFilename = "" #used for checking the alpha texture is the same as the diffuse
    for node in mat.node_tree.nodes:
        #skip non supported configurations
        if node.name != 'Image Texture':
            #print( "node.name != 'Image Texture': %s" % (node.name) )
            continue
        if node.image != None:
            tex = node.image
            #print("found image shader node")

            
            if node.inputs[0].links[0].from_socket.name != 'UV':
                print("Texture doesn't use UV coordinates: node.inputs[0].links[0].from_socket.name: %s" % (node.inputs[0].links[0].from_socket.name) )
                continue
            else:
                #write the texture type and filename
                ######

                #get the texture filename
                path = tex.filepath
                directory, filename = os.path.split(path)
                #filename = os.path.splitext(filename)[0] #strip the file type

                #write the texture type
                out.write('tex\n')
                if node.outputs['Color'].links[0].to_socket.name == 'Base Color':
                    diffuseTextureFilename = filename
                    out.write('difTex\t %s\n' % (diffuseTextureFilename)) #diffuse texture
                if node.outputs['Color'].links[0].to_socket.name == 'Normal':
                    normalAmount = 1#texture.norfac
                    out.write('normTex\t %f\n' % (normalAmount))  #normal texture
                if node.outputs['Color'].links[0].to_socket.name == 'Emission':
                    emitAmount = 1#texture.dvar
                    out.write('lumTex\t %f\n' % (emitAmount))    #emissive texture
                if node.outputs['Color'].links[0].to_socket.name == 'Alpha' or\
                   (len(node.outputs['Alpha'].links) >= 1 and node.outputs['Alpha'].links[0].to_socket.name == 'Alpha') :
                    if(filename == diffuseTextureFilename):
                        out.write('difTexAisAlpha\n')                 #write out a flag if the alpha channel of the diffuse texture is used
                    else:
                        #don't support seperate alpha/diffuse textures
                        print("Alpha texture is not diffuse Texture ")
                        out.write('e\n')
                        continue
                #
                #write out the texture filename
                out.write( 'fileName %s \n' % (filename))
                out.write('e\n')
                #
                #check that the texture exists
                #absPath = Blender.sys.expandpath(path)
                full_path = bpy.path.abspath(tex.filepath, library=tex.library)
                absPath = os.path.normpath(full_path)
                #absPath = bpy.path.abspath( mat.node_tree.nodes["Image Texture"].image.filepath[2:])
                if( not os.path.isfile(absPath) ):
                    print("Cannot find texture file " + absPath + " of  mat: " + mat.name)
                    out.close()
                    return

                #copy the texture file into the proper folder
                newPath = assetDirectory+"/textures/"+filename
                print( "copying texturefile from absPath %s newPath %s" % (absPath, newPath) ) 
                shutil.copyfile(absPath, newPath)
    out.write('\n')

    #write out the shader settings
    ##############################

    #output the shader diffuse color and amount
    print( 'base color: %s' % str(p.base_color) )
    [r, g, b] = p.base_color
    out.write('difCol\t\t %f %f %f\n' % (r, g, b))
    #output the shader specular color amount and hardness
    out.write('specMixHrd\t %f %f\n' % (p.specular, p.roughness))
    #output the material alpha value
    out.write('alph\t\t %f\n' % (p.alpha))
    #output the material emission amount
    emColor = p.emission_color
    out.write('lumCol\t\t %f %f %f\n' % (emColor[0], emColor[1], emColor[2]))

    out.close()

def writeMesh(assetDirectory, ob):
    """Write a HavenTech mesh file from the passed in blender object"""

    #get the mesh data
    mesh = ob.data #getData()
    
    #print( "writeMesh: %s" %(ob.name) ) 

    #check that geting the raw mesh data worked
    if not mesh:
        print("Can\'t get Mesh data for obj: " + ob.name )
        return

    #check the mesh has UV's
    if not mesh.uv_layers: #.hasFaceUV():
        print( "Mesh: " + mesh.name + " does not have uv coordinates" )
        return

    meshFileName = assetDirectory + "/meshes/" + ob.name + ".hvtMesh"

    #check the user is ok with saving over an old file (if it exists)
    #if not BPyMessages.Warning_SaveOver(meshFileName):
    #    return
    
    #open the ouput file
    out = open( meshFileName, "w" )

    #write the mesh scale, rotation and translation
    out.write( 'm\n' )
    out.write( 's %f %f %f\n' % (ob.scale[0], ob.scale[1], ob.scale[2])) #SizeX, ob.SizeZ, ob.SizeY))
    quatRot = ob.rotation_quaternion
    out.write( 'r %f %f %f %f\n' % (quatRot[0], quatRot[1], quatRot[2], quatRot[3])) #ob.RotX, ob.RotZ, -ob.RotY))
    loc = ob.location
    out.write( 'x %f %f %f\n' % (loc[0], loc[1], loc[2])) #ob.LocX, ob.LocZ, -ob.LocY))
    out.write( 'e\n' )
    out.write( '\n' )

    #keep track of the min and max corners of the AABB
    wMinV = vec3NewScalar( sys.float_info.max )
     
    wMaxV = vec3NewScalar( sys.float_info.min )

    #write the verticies (position, normal, texture coordinate, and bone weight)
    numVerts = len(mesh.vertices)
    out.write( 'cv %i\n' % (numVerts) )
    out.write( '\n' )
    for i in range(numVerts):
        vert = mesh.vertices[i]  #verts[i]
        wVert = ob.matrix_world @ vert.co
        vec3Max( wMaxV, wVert )
        vec3Min( wMinV, wVert )
        out.write( 'v %f %f %f\n' % (vert.co.x, vert.co.y, vert.co.z) )
        out.write( 'n %f %f %f\n' % (vert.normal.x, vert.normal.y, vert.normal.z) )
        #normalize the bone weights
        boneWeights = []
        boneWeightTotal = 0.0
        for influencingGroup in vert.groups:
            boneWeight = (influencingGroup.group, influencingGroup.weight)
            if boneWeight[1] < 0.0:
                print('Error%t|Negative Bone Weight')
                out.close()
                return
            boneWeightTotal += boneWeight[1]
            boneWeights.append(boneWeight)
        #print out the bone weights
        for boneWeight in boneWeights:
            #a bone weight is a (name, weight) pair
            out.write( 'w %s %f\n' % ( boneWeight[0],
                                       boneWeight[1]/boneWeightTotal ) )
        out.write( 'e\n' )

    #write the faces
    out.write('cf %i\n' % (len(mesh.polygons)))
    triCt = 0
    for face in mesh.polygons:
        fVertCt = len(face.vertices)
        if not (len(face.vertices) == 4 or len(face.vertices)==3):
            print('Error%t|Mesh: ' + mesh.name + ' not entirely quads and tris')
            out.close()
            return
        if fVertCt == 3:
            triCt += 1
        else:
            triCt += 2
        out.write('f\n')
        out.write('m %i\n' % (face.material_index)) #write the index of the face material
        out.write('v')
        for vert in face.vertices:
            out.write( ' %i' % (vert) )
        out.write('\n')
        try:
            out.write('u')
            for vert_idx, loop_idx in zip(face.vertices, face.loop_indices):
                uv_coords = ob.data.uv_layers.active.data[loop_idx].uv
                #print("face idx: %i, vert idx: %i, uvs: %f, %f" % (face.index, vert_idx, uv_coords.x, uv_coords.y))
                out.write( ' %f %f' % (uv_coords[0], uv_coords[1]) )
        except:
        	print( "can't read uv data, make sure %s isn't in edit mode" % (ob.name) )
        out.write('\ne\n')

    #end of mesh data
    out.write('ct %i\n' % (triCt))
    out.close()
    
    return [ wMinV, wMaxV ]
    
def writeObjectAnimationData(assetDirectory, obj):
        
    #print( "writing animation curve data for " + obj.name + "\n" )
    
    #check that the data we need exists (if there isn't animation for the object it won't have animData.action)
    animData = obj.animation_data
    if animData == None or animData.action == None or len(animData.action.fcurves) < 1:
        return
        
    curves = obj.animation_data.nla_tracks.data.action.fcurves.items()
    
    ipoFileName = assetDirectory + "/IPOs/" + obj.name + ".hvtIPO"
    #open the output file
    out = open(ipoFileName, "w")
    
    writeAnimationCurves(out, curves)
    
    out.close()
    
    
def writeAnimationCurves(outputFile, curves):
    #---write the ipo curves---
    #-------------------------------
    for curveTuple in curves:#Ipo.getCurves():
        curve = curveTuple[1]
        writeAnimationCurveData(outputFile, curve)

def writeAnimationCurveData(out, curve):

    out.write('c %s\n' % (curve.data_path.replace (" ", "_")))#curve.getName()))
    out.write('i %s\n' % (curve.keyframe_points[0].interpolation)) #write out the interpolation type of the curve
    out.write('b\n') #indicate the start of the bezier points
    out.write('c %i\n' % len(curve.keyframe_points))#bezierPoints)) #num bezier points
    for keyframe_point in curve.keyframe_points:#bezierPoint in curve.bezierPoints:
        point = keyframe_point.co
        #knot = bezierPoint.vec[1]
        
        [time, value] = [point[0], point[1]] #knot
        [handle_left_time, handle_left_value]   = [keyframe_point.handle_left[0], keyframe_point.handle_left[1]]
        [handle_right_time, handle_right_value] = [keyframe_point.handle_right[0], keyframe_point.handle_right[1]]
        
        out.write('p %f %f %f %f %f %f\n' % (time, value, handle_left_time, handle_left_value, handle_right_time, handle_right_value)) #write out the point knot
    out.write('e\n') #end of points
    out.write('e\n') #end of curve



def writeKeyframeMeshData(assetDirectory, ob):
    """
    writes the mesh key shapes and animation curves
    """

    keyFileName = assetDirectory + "/meshKeys/" + ob.name + ".hvtKeys"

    #check the data we need exists
    mesh = ob.data
    if mesh == None:
        print("writeKeyFrames for a non mesh object: " + ob.name)
        return
    keyObject = mesh.shape_keys
    if keyObject == None:
        #Blender.Draw.PupMenu('Error%t| writeKeyFrames no key data for object: ' 
        #                       + ob.name)
        return
        
    if keyObject.animation_data == None:
        print("writeKeyFrameShapes for a keyObject without animation data: " + ob.name)
        return
        
    curves = keyObject.animation_data.nla_tracks.data.action.fcurves.items()

    #open the output file
    out = open(keyFileName, "w")

    #---write the keyframe curves---
    #-------------------------------
    writeAnimationCurves(out, curves)
    for curve in keyIpo.getCurves():
        out.write('c %s\n' % (curve.data_path.replace (" ", "_")))
        out.write('i %i\n' % (curve.interpolation)) #write out the interpolation type of the curve
        out.write('b\n') #indicate the start of the bezier points
        out.write('c %i\n' % len(curve.bezierPoints)) #num bezier points
        for bezierPoint in curve.bezierPoints:
            knot = bezierPoint.vec[1]
            [x, y, z] = knot
            out.write('p %f %f %f\n' % (x, y, z)) #write out the point knot
        out.write('e\n') #end of points
        out.write('e\n') #end of curve
    

    #---write the keyframe shapes---
    #-------------------------------
    #unfortunately, blender keyframe data only contains the new vertex
    #locations at a keyframe point in time
    #we need both normals and the vert positions
    #so to get this, get the ipo curves controlling the interpolation between
    #the keyframes, and insert keyframes it so that we can can recover the
    #keyframe shapes and normals

    for block in keyObject.key_blocks:
        out.write('k %s\n' % (block.name.replace (" ", "_")))
        blockData = block.data
        if blockData == None:
            print("writeKeyFrames no block data for block: " +block.name + 'object: ' + ob.name)
            out.close()
            return
        out.write('c %i\n' % len(blockData)) #count of verticies
        for vert in blockData:
            out.write('v %f %f %f\n' % (vert.co[0], vert.co[1], -vert.co[2])) #vert positions
        out.write('e\n')

    out.close()
        

def writeAnim(assetDirectory, ob):
    """Write a haven tech animation file from the given blender armature object"""

    animFileName = assetDirectory + "/skelAnimations/" + ob.name + ".hvtAnim"

    #look for the objects armature modifier
    armatureObj = None
    for modifier in ob.modifiers:
        if modifier.type == 'ARMATURE':
            armatureObj = modifier.object
            #check the armature modifier does not use envelopes
            if modifier.use_bone_envelopes:
                print('Error%t|Armature modifier uses envelopes,' + ' only vertex groups are allowed')
                return
            #check the armature modifer uses vertex groups
            if not modifier.use_vertex_groups:
                print('Error%t|Armature modifier on obj: ' + ob.name + ' does not use vertex groups')
                return

    if armatureObj == None:
        #Blender.Draw.PupMenu('Notice%t|Object: ' + ob.name + \
        #                            ' does not have an Armature modifier')
        return

    #get the armature from the object
    armature = armatureObj.data

    #check there is an armature        
    if armature == None:
        print('Error%t|Failed to get Armature data')
        return

    #check the user is ok with saving over an old file (if it exists)
    #if not BPyMessages.Warning_SaveOver(animFileName):
    #    return

    #open the output file
    out = open(animFileName, "w")
    
    #write out the armatures scale, rotation and translation
    out.write( 's %f %f %f\n' % \
                (armatureObj.scale.x, armatureObj.scale.y, armatureObj.scale.z))
    out.write( 'r %f %f %f\n' % \
                (armatureObj.rotation_euler.x,  armatureObj.rotation_euler.y,  armatureObj.rotation_euler.z))
    out.write( 'x %f %f %f\n' % \
                (armatureObj.location.x,  armatureObj.location.y,  armatureObj.location.z))

    #write each bone's rest data and animation data
    for (boneName, bone) in armature.bones.items():
        out.write( 'b\n')
        out.write( 'N %s\n' % boneName )
        if bone.parent != None:
            out.write( 'p %s\n' % bone.parent.name )
        else:
            out.write( 'p %s\n' % "None" )

        for child in bone.children:
            out.write( 'c %s\n' % child.name )

        #write out bind pose data (bonespace)
        head = bone.head
        #write the location of the bones head in relation to its parents tail
        out.write( 'H %f %f %f\n' % (head[0], head[1], head[2]) )
        #write the location of the bones tail
        tailPosition = bone.tail
        out.write( 'T %f %f %f\n' % \
            (tailPosition[0], tailPosition[1], tailPosition[2]) )
        #out.write( 'R %f\n' % math.radians(bone.roll['BONESPACE']) )

        #write out the animation data of the bone
        writeBoneKeyframes(out, armatureObj, boneName)
        #mark the end of the bone data
        out.write('e\n')

    #end of animation data
    out.write('\n')
    out.close()

### Helper functions ###
#----for writeAnim-----

def writeBoneKeyframes(out, armature, boneName):
    #get the Ipo channel corresponding to the bone
    try:
        boneChannel = armature.action.getChannelIpo( boneName )
    except:
        #there are no keyframes for the bone
        print( "No keyframes for: %s" % boneName )
        return
    
    #print the keyframes for each type of motion for the bone
    boneChannelCurves = boneChannel.getCurves()
    for boneCurve in boneChannelCurves:
        printCurve(out, boneCurve)

def printCurve(out, curve):
    for triple in curve.getPoints():
        #for each Bez triple, ignore its handle values (.vec[0] and .vec[2])
        #just write out its time and value
        type = curve.name
        if   type == "ScaleX":
            outputName = 'A'
        elif type == "ScaleY":
            outputName = 'B'
        elif type == "ScaleZ":
            outputName = 'C'
        elif type == "QuatW":
            outputName = 'W'
        elif type == "QuatX":
            outputName = 'J'
        elif type == "QuatY":
            outputName = 'K'
        elif type == "QuatZ":
            outputName = 'L'
        elif type == "LocX":
            outputName = 'X'
        elif type == "LocY":
            outputName = 'Y'
        elif type == "LocZ":
            outputName = 'Z'        
        else:
            outputName = type
        out.write('%s %f %f\n' % \
                (outputName, triple.vec[1][0], triple.vec[1][1]))
