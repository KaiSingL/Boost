#!/bin/zsh

# Zsh script to zip the Boost folder contents, excluding examples folder, .gitignore, and README.md
# Run this in the Boost directory: ~/Documents/Boost (or equivalent)

echo "DEBUG: Starting zip process in current directory: $(pwd)" >&2

# Define the output zip file
zip_file="Boost.zip"
echo "DEBUG: Output zip file will be: $zip_file" >&2

# Check if zip file already exists and remove it if so
if [[ -f $zip_file ]]; then
    echo "DEBUG: Existing zip file found, removing it..." >&2
    rm -f $zip_file
fi

# Define exclusions
exclusions=(
    ".gitignore",
    "examples", 
    "README.md",
    "AGENTS.md", 
    "zipper.zsh", 
    "zipper.ps1"
    )
    
echo "DEBUG: Exclusions: ${exclusions[*]}" >&2

# Create a temporary list of items to include
items_to_include=()
for item in *; do
    skip=false
    for excl in "${exclusions[@]}"; do
        if [[ $item == $excl ]]; then
            skip=true
            break
        fi
    done
    if [[ $skip == false ]]; then
        items_to_include+=("$item")
    fi
done

echo "DEBUG: Items to include: ${items_to_include[*]}" >&2

# Create the zip archive with the filtered items
echo "DEBUG: Creating zip archive..." >&2
zip -r "$zip_file" "${items_to_include[@]}" >/dev/null 2>&1

# Verify the zip was created
if [[ -f $zip_file ]]; then
    zip_size=$(stat -f%z "$zip_file" 2>/dev/null || stat -c%s "$zip_file" 2>/dev/null)
    echo "DEBUG: Zip created successfully! Size: $zip_size bytes" >&2
else
    echo "ERROR: Zip creation failed!" >&2
    exit 1
fi

echo "DEBUG: Zip process completed." >&2