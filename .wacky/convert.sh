
gifs_width="512"

gifs=(
    hrotate
    vrotate
    scale
    hmove
    vmove
    rotate
)

for gif_name in "${gifs[@]}"; do
    ffmpeg -i "$gif_name.mp4" -vf "fps=15,scale=$gifs_width:-1" "$gif_name.webp" -y
done

rm palette.png