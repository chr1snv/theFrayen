import zipfile
import os

def zip_folder(folder_path, output_path):
	with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
		#print(help(zip_file.write))
		for root, _, files in os.walk(folder_path):
			for file in files:
				# Create the relative path for the file
				file_path = os.path.join(root, file)
				# Getting the relative path without including the folder_path
				arcname = os.path.relpath(file_path, start=folder_path)
				#print( "appending " + file_path + " arcname " + arcname )
				# Write the file to the zip file
				zip_file.write(file_path, arcname)

zip_path = 'havenTech.zip'

if os.path.exists(zip_path):
	os.remove(zip_path)
	print(f"File '{zip_path}' has been removed.")
else:
	print("zip does not exist")

zip_folder('.', zip_path)
print("wrote " + zip_path)
