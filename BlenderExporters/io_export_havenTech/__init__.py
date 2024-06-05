#!BPY

"""
Name: 'HavenTech (Scene)'
Blender: 249
Group: 'Export'
Tooltip: 'HavenTech Scene Exporter'
"""
bl_info = {
"name": "HavenTech (Scene)",
"author": "Chris",
"version": (1, 0),
"blender": (3, 0, 1),
"location": "File > Export",
"description": "Exports a HavenTech scene.",
"category": "Export"
}
#import Blender
#import BPyMessages
import bpy
from bpy.props import (
        BoolProperty,
        FloatProperty,
        StringProperty,
        EnumProperty,
        )
from bpy_extras.io_utils import (
        ExportHelper,
        orientation_helper,
        path_reference_mode,
        axis_conversion,
        )
#from Blender import Modifier
import os, math, shutil

def prRed(skk): print("\033[91m {}\033[00m" .format(skk))
def prGreen(skk): print("\033[92m {}\033[00m" .format(skk))
def prYellow(skk): print("\033[93m {}\033[00m" .format(skk))
def prLightPurple(skk): print("\033[94m {}\033[00m" .format(skk))
def prPurple(skk): print("\033[95m {}\033[00m" .format(skk))
def prCyan(skk): print("\033[96m {}\033[00m" .format(skk))
def prLightGray(skk): print("\033[97m {}\033[00m" .format(skk))
def prBlack(skk): print("\033[98m {}\033[00m" .format(skk))

from functions_hvtmdl import writeModel, writeArmature, writeObjectAnimationData, vec3Min, vec3Max, vec3NewScalar

#directory creation helper function
def make_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)
        
def AveragePts( pt1, pt2 ):
    return [ pt1[0] + pt2[0] / 2, 
             pt1[1] + pt2[1] / 2, 
             pt1[2] + pt2[2] / 2 ]
             
def ObjsOverlapInAllAxies( ob1Min, ob1Max, ob2Min, ob2Max ):
     axisOverlaps = [False, False, False]
     for axis in range(3):
        if( ob2Min[axis] < ob1Min[axis] and ob1Min[axis] < ob2Max[axis] or \
            ob2Min[axis] < ob1Max[axis] and ob1Max[axis] < ob2Max[axis] or \
            ob1Min[axis] < ob2Min[axis] and ob2Min[axis] < ob1Max[axis] ):
            axisOverlaps[axis] = True
     if( axisOverlaps[0] and axisOverlaps[1] and axisOverlaps[2] ):
        return True #all three axies overlap

Max_Node_Objects = 5
class OctTreeNode( ): #I think here is where classes to derive from are placed
    
    objects  = [] #the objects in this node sorted by position on the axis
    #of the node
    minNode = None #if this node subdivides  the x axis
    maxNode = None #then the subnodes divide the y, etc
    
    #here is where constructor inputs are placed
    def __init__(self, nmin, nmax, axis):
        prPurple("oct tree node init" + str(nmin) + " : " + str(nmax) + str(axis) )
        self.axis = axis
        self.min  = nmin
        self.max  = nmax
        self.mid  = AveragePts( self.min, self.max )
    
    def GetGreatestObjectLimit(self):
        return self.objects[-1].aabbMax[self.axis]
    def GetLeastObjectLimit(self):
        return self.objects[0].aabbMin[self.axis]
    
    #check if there are overlaps with already added objects
    #if not check if should subdivide ( max objects added to node )
    def AddObject( self, obj ):
        #first try to add the object to this node's object list
        prCyan( "addObject " + str(obj.obj.name) + " node num objects " + str(len(self.objects)) )
        if len(self.objects) < Max_Node_Objects :
            prYellow( "check if the object is less than any of the array objects" )
            for i in range( len(self.objects) ):
                #take the midpoint of the object in the array and object, and
                #insert based on the midpoint and check that there isn't
                #an overlap in all three axies
                prYellow( "is the array object mid is greater \
                            than the new object mid (new obj before)" )
                if self.objects[i].aabbMid[self.axis] > obj.aabbMid[self.axis]:
                    if not checkOverlapsInAxies(
                        self.objects[ i ].aabbMin, self.objects[ i ].aabbMax,
                        self.obj.aabbMin,          self.obj.aabbMax ):
                        return False
                    prYellow( "is the previous array object present?" )
                    if i-1 > 0:
                        prYellow( "does the object below overlap?" )
                        if not checkOverlapsInAxies( 
                            self.objects[ i - 1].aabbMin,
                            self.objects[ i - 1].aabbMin, 
                            obj.aabbMin, 
                            obj.aabbMax ):
                                return False
                    prGreen( "insert location found " + str(i) + 
                           " no object below or no overlap" )
                    self.objects.insert( i, obj )
                    return
            prBlack( "finished comparing array objects" )
            prBlack( "the max array object min is less than the new object max" )
            prBlack( "checking greatest object for potential overlap" )
            if len(self.objects) > 0: 
                if self.objects[-1].aabbMax[self.axis] > obj.aabbMin[self.axis]:
                    prRed( "greatest object " + self.objects[-1].obj.name + \
                    " overlaps " + obj.obj.name + " in axis " + str(self.axis) )
                    return False
            prBlack( "no objects or no objects less than overlap" )
            self.objects.insert( -1, obj )
            prGreen( "added object" )
            return
            
        prLightPurple("there are too many objects in the node")
        
        if( obj.aabbMin[self.axis] > self.mid[self.axis] ):
            prLightPurple("the object goes in the maxNode")
            if( self.maxNode == None ):
                self.maxNode = OctTreeNode( self.min, self.mid, (self.axis+1)%3 )
            self.maxNode.AddObject( obj )
        elif( obj.aabbMax[self.axis] < self.mid[self.axis] ):
            prLightPurple("the object goes in the minNode")
            if( self.minNode == None ):
                self.minNode = OctTreeNode( self.min, self.mid, (self.axis+1)%3 )
            self.minNode.AddObject( obj )
        else:
            prLightPurple("object overlaps midpoint of this node")
            prLightPurple("check for overlaps in the min node")
            if( self.minNode.checkOverlap( obj.aabbMin, obj.aabbMax ) ):
                return False
            prLightPurple("check for overlaps in the max node")
            if( self.maxNode.checkOverlap( obj.aabbMin, obj.aabbMax ) ):
                return False
                
            #it overlaps the midpoint but not any objects, therefore
            #move the midpoint to halfway between the object max or min
            #and the next object in the min or max nodes
            
            #since it doesn't overlap with any objects
            prLightPurple("shift the midpoint between the min and max nodes")
            prLightPurple("to add new object to one of them")
            minGreatest = self.minNode.GetGreatestObjectLimit( self.axis )
            minNumObjects = self.minNode.NumObjects()
            maxLeast    = self.maxNode.GetLeastObjectLimit(    self.axis )
            maxNumObjects = self.maxNode.NumObjects()
            
            #prefer the node with the least number of objects to place the
            #new object into
            if( minNumObjects < maxNumObjects ):
                prPurple("place the new object in the min node")
                newMidPoint = ( maxLeast + this.mid[this.axis] ) / 2
                self.minNode.max[self.axis+1] = newMidPoint
                self.minNode.mid[self.axis+1] = ( self.minNode.min + newMidPoint ) / 2
                self.minNode.AddObject( obj )
            else:
                prPurple("place the new object in the max node")
                newMidPoint = ( minGreatest + self.mid[self.axis] ) / 2
                self.maxNode.min[self.axis+1] = newMidPoint
                self.maxNode.mid = AveragePts( self.maxNode.min + self.maxNode.max ) / 2
                self.maxNode.AddObject( obj )
            
            
            
#component axis seperated occupancy linked lists for checking 
#there aren't overlapping
#objects (inserted into and checked with binary search)
#this combined with a skiplist (heirarchical pointers of groups of objects)
#could be an an alternative to an oct tree, however insertion into an
#array isn't ideal, and effectively any structure with hierarchical links
#becomes a tree
rootNode = OctTreeNode( [-100000, -100000, -100000 ], [100000, 100000, 100000 ], 0 )
class TreeObj():
    def __init__(self, aabbMin, aabbMax, obj):
        self.aabbMin = aabbMin
        self.aabbMax = aabbMax
        self.obj = obj
        self.aabbMid = [ ( aabbMin[0] + aabbMax[0] ) / 2, \
                         ( aabbMin[0] + aabbMax[0] ) / 2, \
                         ( aabbMin[0] + aabbMax[0] ) / 2 ]

#if large objects ( enviroment / scenery / buildings ) have objects inside
#of them, it may be helpful to automatically seperate them into convex parts
#to allow them to be added to the oct tree

#exports a haventech scene from blender
def writeScene(path):
    """Write a HavenTech scene file, and mesh, animation, light, and camera
    files for each of the items in the scene recognized by HavenTech"""
    
    rootNode = OctTreeNode( [-100000, -100000, -100000 ], [100000, 100000, 100000 ], 0 )

    #get the haventech asset directory
    assetDirectory, filename = os.path.split(path)

    #get the scene name
    print( "assetDirectory %s filename %s" % ( assetDirectory, filename ) )
    directoryParts = assetDirectory.split('/')
    directory = ""
    for i in range(len(directoryParts)-1):
        directory += '/' + directoryParts[i]
    #directory = bpy.context.space_data.params.directory
    sceneName = filename.split('.')[0]#bpy.context.space_data.params.filename.split('.')[0]
    if(sceneName == ""):
        sceneName = "NoName"
    sceneFileName = assetDirectory+"/scenes/"+sceneName+".hvtScene"
    
    print( "sceneFileName %s" % (sceneFileName) )

    #make a directory structure for the scene
    sceneDirectory = assetDirectory+"/scenes/"+sceneName
    shutil.rmtree(sceneDirectory, True) #remove any existing files
    make_dir(sceneDirectory)
    make_dir(sceneDirectory+"/meshes")
    make_dir(sceneDirectory+"/IPOs")
    make_dir(sceneDirectory+"/meshKeys")
    make_dir(sceneDirectory+"/skelAnimations")
    make_dir(sceneDirectory+"/meshMaterials")
    make_dir(sceneDirectory+"/materials")
    make_dir(sceneDirectory+"/textures")

    #check the user is ok with saving over an old file (if it exists)
    #if not BPyMessages.Warning_SaveOver(sceneFileName):
    #    return

    #open the output file
    out = open(sceneFileName, "w")#file(sceneFileName, "w")

    #get the current scene
    sce = bpy.data.scenes[0]#.active
    
    xAxisOcupiedRegions = []
    yAxisOcupiedRegions = []
    zAxisOcupiedRegions = []
    
    mshCt  = 0
    lghtCt = 0
    camCt  = 0
    wMin = vec3NewScalar(  9999999 )
    wMax = vec3NewScalar( -9999999 )
    
    #loop through each of the objects in the scene
    for i in range(len(sce.objects)):
        obj = sce.objects[i]
        print( "objType %s %s" % (obj.type, obj.name) )
        #add the information for placing the object in the scene file
        #and call the corresponding exporter for each object
        #dont allow objects with the same origin/overlapping aabb because
        #they will not allow for object seperation in the renderer
        #having objects inside eachother can be done by having the outside
        #object be multiple objects
        #overlaping aabb's are not allowed though because it could create the
        #potential for a ray to have to be tested with many objects per oct tree
        #node because if things arent oct tree seperable then there isn't
        #an algorithm in the renderer to determine if a ray intersects an object
        #without testing every object ( 
        #numRays*numObjects => 1,000,000 * 1,000,000 => 1,000,000,000,000
        #very slow compared to num rays * log ( num objects ) => 
        #1,000,000 * log(1,000,000) => 6,000,000
        #it would be 1,000,000 times lower frame rate
        
        ipoFileName = writeObjectAnimationData(sceneDirectory, obj)
        
        if obj.type == 'MESH' or obj.type == 'ARMATURE':
            prefixTypeLetter = 'm'
            if obj.type == 'ARMATURE':
                prefixTypeLetter = 'a'
            out.write( '%s %s\n' % (prefixTypeLetter, obj.name) )
            print( 'idx %i mesh %s' % (i, obj.name) )
            if obj.type == 'ARMATURE':
                mAABBws = writeArmature(sceneDirectory, obj)
            else:
                mAABBws = writeModel(sceneDirectory, obj, ipoFileName) #world space aabb
                print( 'AABB %s' % mAABBws )
                if mAABBws == None:
                    print( 'Mesh object %s not exportable (AABB not returned)' % \
                        obj.name )
                    break
                else:
                    out.write( 'baabb %f %f %f  %f %f %f\n' % \
                        (mAABBws[0][0], mAABBws[0][1], mAABBws[0][2], 
                         mAABBws[1][0], mAABBws[1][1], mAABBws[1][2]) )
                    aabbMin = mAABBws[0]
                    aabbMax = mAABBws[1]
                    vec3Min( wMin, aabbMin )
                    vec3Max( wMax, aabbMax )
                    newObj = TreeObj(aabbMin, aabbMax, obj)
                #addSuccessful = rootNode.AddObject( newObj )
                #print( "object aabb overlap check result " + \
                #    str( addSuccessful ) )
                #if addSuccessful == False:
                #    break
                #AddOccupiedRegion( AABB[0], AABB[3], 0 )
                #AddOccupideRegion( AABB[1], AABB[4], 1 )
                #AddOccupiedRegion( AABB[2], AABB[5], 2 )
            out.write( 'mloc %f %f %f \n' % \
                 (obj.location[0], obj.location[1], obj.location[2]))
            out.write( 'mrot %f %f %f \n' % \
                 (obj.rotation_euler[0], \
                  obj.rotation_euler[1], \
                  obj.rotation_euler[2]))
            mshCt += 1
            out.write( 'mEnd\n\n' )
        if obj.type == 'LIGHT':
            lampD = obj.data;
            out.write( 'l %s\n' % (obj.name))
            out.write( 'ltype %s \n' % (lampD.type))
            out.write( 'lloc %f %f %f\n' % (obj.location[0], obj.location[1], obj.location[2]))
            out.write( 'lrot %f %f %f\n' % (obj.rotation_euler[0], obj.rotation_euler[1], obj.rotation_euler[2]))
            out.write( 'lcol %f %f %f\n' % (lampD.color[0], lampD.color[1], lampD.color[2]))
            out.write( 'lenrg %f\n' % (lampD.energy))
            try:
                out.write( 'lspotsz %f\n' % (lampD.spot_size)) #radians angle
            except:
                None
            lghtCt += 1
            out.write( 'lEnd\n\n' )
            vec3Min( wMin, obj.location )
            vec3Max( wMax, obj.location )
        if obj.type == 'CAMERA':
            out.write( 'c %s \n' % (obj.name))
            print(" camera %s" % (obj.name) )
            out.write( 'cloc %f %f %f\n' % (obj.location[0], obj.location[1], obj.location[2]))
            out.write( 'crot %f %f %f\n' % (obj.rotation_euler[0], obj.rotation_euler[1], obj.rotation_euler[2]))
            camData = obj.data
            out.write( 'cang %f\n' % (camData.angle))
            out.write( 'cstartend %f %f\n' % (camData.clip_start, camData.clip_end))
            camCt += 1
            out.write( 'cEnd\n\n' )
            vec3Min( wMin, obj.location )
            vec3Max( wMax, obj.location )
        
        print(" ") #console output line break between objects
    
    #write out the active camera
    sceCamName = str( 'ac %s\n' % sce.camera.name )
    out.write(sceCamName)
    print(sceCamName)
    sceStats = str('sceStats objs %i lghts %i cams %i\nsceAABB %f %f %f  %f %f %f\nsceEnd' % 
    	(mshCt, lghtCt, camCt,   wMin[0], wMin[1], wMin[2],   wMax[0], wMax[1], wMax[2]) )
    out.write( sceStats )
    print( sceStats )
    #close the output file
    out.close()
    
    
    #Blender.Draw.PupMenu('Success%t| Successfully wrote scene file: ' \
    #                                                           + sceneName)

#@orientation_helper(axis_forward='-Z', axis_up='Y')
class ExportHVTScene(bpy.types.Operator, ExportHelper):
    """Save a Haven Tech Scene File"""

    bl_idname = "export_scene.hvtscene"
    bl_label = 'Export HVTScene'
    bl_options = {'PRESET'}

    filename_ext = ".hvtscene"
    filter_glob: StringProperty(
            default="*.obj;*.mtl",
            options={'HIDDEN'},
            )

    # context group
    use_selection: BoolProperty(
            name="Selection Only",
            description="Export selected objects only",
            default=False,
            )
    use_animation: BoolProperty(
            name="Animation",
            description="Write out an OBJ for each frame",
            default=False,
            )
            
    def execute(self, context):
        print(str(context))
        """
        from mathutils import Matrix
        keywords = self.as_keywords(ignore=("axis_forward",
                                            "axis_up",
                                            "global_scale",
                                            "check_existing",
                                            "filter_glob",
                                            ))

        global_matrix = (Matrix.Scale(self.global_scale, 4) @
                         axis_conversion(to_forward=self.axis_forward,
                                         to_up=self.axis_up,
                                         ).to_4x4())

        keywords["global_matrix"] = global_matrix
        """
        writeScene(self.filepath)
        return {'FINISHED'}
            
    def draw(self, context):
        pass

###script entry point###
#Blender.Window.FileSelector(writeScene, "Select Haven Tech Root Directory", "")

bl_info = \
{
    "name": "Haven Tech Scene exporter",
    "author": "Chris",
    "version": (3, 8, 0),
    "blender": (2, 81, 6),
    "location": "File > Export",
    "description": "Export Haven Tech mesh, UV's, materials and textures",
    "category": "Export"
}

   
classes = (
    ExportHVTScene,
)


if "bpy" in locals():
    import importlib
    if "export_hvtscene" in locals():
        importlib.reload(export_hvtscene)

def menu_func_export(self, context):
    self.layout.operator(ExportHVTScene.bl_idname, text="HVT Export (.hvtscene)")
    
def register():
    for cls in classes:
        bpy.utils.register_class(cls)

    bpy.types.TOPBAR_MT_file_export.append(menu_func_export)


def unregister():
    bpy.types.TOPBAR_MT_file_export.remove(menu_func_export)

    for cls in classes:
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
