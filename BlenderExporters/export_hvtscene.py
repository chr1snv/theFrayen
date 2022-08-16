#!BPY

"""
Name: 'HavenTech (Scene)'
Blender: 249
Group: 'Export'
Tooltip: 'HavenTech Scene Exporter'
"""
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
from functions_hvtmdl import writeModel, writeObjectAnimationData

#directory creation helper function
def make_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

#exports a haventech scene from blender

def writeScene(path):
    """Write a HavenTech scene file, and mesh, animation, light, and camera
    files for each of the items in the scene recognized by HavenTech"""

    #get the haventech asset directory
    assetDirectory, filename = os.path.split(path)

    #get the scene name
    directoryParts = bpy.data.filepath.split('/')
    directory = ""
    for i in range(len(directoryParts)-1):
        directory += '/' + directoryParts[i]
    #directory = bpy.context.space_data.params.directory
    sceneName = directoryParts[-1].split('.')[0]#bpy.context.space_data.params.filename.split('.')[0]
    if(sceneName == ""):
        sceneName = "NoName"
    sceneFileName = assetDirectory+"/scenes/"+sceneName+".hvtScene"

    #make a directory structure for the scene
    sceneDirectory = assetDirectory+"/scenes/"+sceneName
    shutil.rmtree(sceneDirectory, True) #remove any existing files
    make_dir(sceneDirectory)
    make_dir(sceneDirectory+"/meshes")
    make_dir(sceneDirectory+"/IPOs")
    make_dir(sceneDirectory+"/meshKeys")
    make_dir(sceneDirectory+"/skelAnimations")
    make_dir(sceneDirectory+"/meshMaterials")
    make_dir(sceneDirectory+"/shaders")
    make_dir(sceneDirectory+"/textures")

    #check the user is ok with saving over an old file (if it exists)
    #if not BPyMessages.Warning_SaveOver(sceneFileName):
    #    return

    #open the output file
    out = open(sceneFileName, "w")#file(sceneFileName, "w")

    #get the current scene
    sce = bpy.data.scenes[0]#.active
    
    #loop through each of the objects in the scene
    for obj in sce.objects:
        #add the information for placing the object in the scene file
        #and call the corresponding exporter for each object
        if obj.type == 'MESH':
            out.write( 'm %s\n' % (obj.name))
            writeModel(sceneDirectory, obj)
        if obj.type == 'LIGHT':
            lampD = obj.data;
            out.write( 'l %s ' % (obj.name))
            out.write( '%s ' % (lampD.type))
            out.write( '%f %f %f ' % (obj.location[0], obj.location[1], -obj.location[2]))
            out.write( '%f %f %f ' % (obj.rotation_euler[0], obj.rotation_euler[1], -obj.rotation_euler[2]))
            out.write( '%f %f %f ' % (lampD.color[0], lampD.color[1], lampD.color[2]))
            out.write( '%f\n' % (lampD.energy))
            try:
                out.write( '%f\n' % (lampD.spot_size)) #radians angle
            except:
                None
        if obj.type == 'CAMERA':
            camData = obj.data
            out.write( 'c %s ' % (obj.name))
            out.write( '%f %f %f ' % (obj.location[0], obj.location[1], -obj.location[2]))
            out.write( '%f %f %f ' % (obj.rotation_euler[0], obj.rotation_euler[1], -obj.rotation_euler[2]))
            out.write( '%f ' % (camData.angle))
            out.write( '%f %f\n' % (camData.clip_start, camData.clip_end))
        writeObjectAnimationData(sceneDirectory, obj)
    
    #write out the active camera
    out.write('ac %s\n' % sce.camera.name)
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
