import os
import subprocess

root = os.path.dirname(__file__)
print(root)

for file in os.listdir(root):
    if file.endswith(".png"):
        print(file)
        subprocess.run(["ffmpeg", "-i", root + f"\\{file}", "-vf", "scale=1080:1080", "-y", root + f"\\result\{file}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)