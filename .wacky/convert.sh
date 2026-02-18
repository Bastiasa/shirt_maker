
gifs_width="480"

gifs=(
    hrotate
    vrotate
    scale
    hmove
    vmove
    rotate
)

for gif_name in "${gifs[@]}"; do
    ffmpeg -i "$gif_name.mp4" -vf scale="$gifs_width:-1" "$gif_name.gif" -y
done