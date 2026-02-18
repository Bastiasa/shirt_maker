
gifs_width="320"

gifs=(
    hrotate
    vrotate
    scale
    hmove
    vmove
    rotate
)

for gif_name in "${gifs[@]}"; do

    vf_start="fps=15,scale=$gifs_width:-1:flags=lanczos"
    
    ffmpeg -i "$gif_name.mp4" -vf "$vf_start,palettegen" palette.png -y
    
    ffmpeg -i "$gif_name.mp4" -i palette.png -filter_complex \
    "$vf_start[x];[x][1:v]paletteuse" "$gif_name.gif" -y

done

rm palette.png