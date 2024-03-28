#!BPY

"""
Name: 'HavenTech (Model)'
Blender: 249
Group: 'Export'
Tooltip: 'HavenTech Model Exporter'
"""
import Blender
from functions_hvtmdl import writeModel

def exportMdl(path):
    assetDirectory, filename = os.path.split(path)

    sce = bpy.data.scenes.active
    ob = sce.objects.active

    writeModel(assetDirectory, ob)

####Script Entry Point####
Blender.Window.FileSelector(exportMdl, "Select Haven Tech Root Directory", "")
