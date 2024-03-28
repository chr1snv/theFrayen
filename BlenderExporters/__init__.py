"""
Name: 'HavenTech (Scene)'
Blender: 249
Group: 'Export'
Tooltip: 'HavenTech Scene Exporter'
"""

bl_info = {
    "name": "HavenTech Scene Exporter",
    "author": "Christopher Hoffman",
    "version": (0, 0, 1),
    "blender": (2, 6, 2),
    "location": "File > Export > HavenTech Scene",
    "description": "Exports a Haven Tech Scene",
    "warning": "",
    "wiki_url": "http://itemfactorystudio.com",
    "tracker_url": "http://itemfactorystudio.com",
    "category": "Import-Export"}
    
if "bpy" in locals():
    import importlib
    if "export_hvtmdl" in locals():
        importlib.reload(export_hvtmdl)
    if "functions_hvtmdl" in locals():
        importlib.reload(functions_hvtmdl)
    if "export_hvtscene" in locals():
        importlib.reload(export_hvtscene)

import bpy
from bpy.props import (
        StringProperty,
        BoolProperty,
        FloatProperty,
        EnumProperty,
        CollectionProperty,
        )

from bpy_extras.io_utils import (
        ExportHelper,
        orientation_helper,
        path_reference_mode,
        axis_conversion,
        )

import bpy
from bpy.types import Operator
from bpy.types import Panel
#from bpy_extras import object_utils
from bpy.props import (
        BoolProperty,
        EnumProperty,
        FloatProperty,
        IntProperty,
        FloatVectorProperty,
        StringProperty,
        )

if "bpy" in locals():
    import importlib
    #importlib.reload(export_hvtScene)
    #importlib.reload(export_hvtmdl)
else:
    from . import export_hvtscene
    from . import export_hvtmdl

import bpy


# ### REGISTER ###
classes = (
	HavenTechSceneExporter
)

def menu_func(self, context):
    self.layout.operator(HavenTechSceneExporter.bl_idname, text="Haven Tech (.hvtscene)")


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    #bpy.utils.register_module(__name__)
	#
    bpy.types.INFO_MT_file_export.append(menu_func)


def unregister():
    #bpy.utils.unregister_module(__name__)
	#
    bpy.types.INFO_MT_file_export.remove(menu_func)
	#
    for cls in classes:
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()

