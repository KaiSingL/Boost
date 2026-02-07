#!/usr/bin/env zsh

# Boost Zipper - Production-grade Zsh script to create a clean Boost.zip
# Excludes common junk, specified files/folders, and the archive itself
# Supports --help, --verbose, and optional --output

set -euo pipefail

# Colors
readonly CYAN="\e[36m"
readonly RED="\e[31m"
readonly GREEN="\e[32m"
readonly BOLD="\e[1m"
readonly RESET="\e[0m"

# Defaults
output_file="Boost.zip"
verbose=0

# ====================== Help Function ======================
show_help() {
    cat << EOF
${BOLD}${CYAN}Usage:${RESET} $(basename $0) [options]

${BOLD}${CYAN}Description:${RESET}
  Creates a clean zip archive of the current directory (intended for Chrome extensions or similar projects),
  excluding development files, macOS junk, the examples folder, and the archive itself.

${BOLD}${CYAN}Options:${RESET}
  ${CYAN}-h, --help${RESET}              Show this help message and exit
  ${CYAN}-v, --verbose${RESET}           Enable detailed [DEBUG] and [INFO] logging
  ${CYAN}-o, --output <file>${RESET}    Specify output zip filename (default: Boost.zip)

${BOLD}${CYAN}Required arguments:${RESET}
  None - runs with sensible defaults in the current directory.

${BOLD}${CYAN}Examples:${RESET}
  ${CYAN}1. Basic usage (most common):${RESET}
     cd ~/Documents/Dev/Boost
     ./zipper.zsh
     → Creates Boost.zip excluding examples/, README.md, etc.

  ${CYAN}2. Verbose with custom output name:${RESET}
     ./zipper.zsh -v -o my-extension.zip
     → Shows detailed debug output and saves to my-extension.zip

EOF
}

# ====================== Argument Parsing ======================
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            verbose=1
            shift
            ;;
        -o|--output)
            if [[ -z "${2:-}" ]]; then
                printf "${RED}Error: --output requires a filename.${RESET}\n" >&2
                show_help
                exit 1
            fi
            output_file="$2"
            shift 2
            ;;
        -*)
            printf "${RED}Error: Unknown option: $1${RESET}\n" >&2
            show_help
            exit 1
            ;;
        *)
            printf "${RED}Error: Unexpected positional argument: $1${RESET}\n" >&2
            show_help
            exit 1
            ;;
    esac
done

# ====================== Logging Helpers ======================
debug() {
    (( verbose )) && printf "[DEBUG] %s\n" "$*" >&2
}

info() {
    (( verbose )) && printf "[INFO] %s\n" "$*" >&2
}

# ====================== Main Process ======================
debug "Starting Boost zipper in: $(pwd)"
debug "Output file: $output_file"
debug "Verbose mode: $verbose"

# Remove existing archive if present
if [[ -f "$output_file" ]]; then
    debug "Removing existing archive: $output_file"
    rm -f "$output_file"
fi

# Exclusion patterns for zip -x
# - Top-level files we never want
# - Entire examples folder and contents
# - Common macOS junk (recursive where needed)
# - The script itself and alternate version
# - The output archive (safety)
exclusions=(
    ".gitignore"
    ".git/*"
    "README.md"
    "AGENTS.md"
    "zipper.zsh"
    "zipper.ps1"
    "examples/*"
    ".DS_Store"
    "*/.DS_Store"
    "__MACOSX"
    "*/__MACOSX/*"
)

debug "Exclusion patterns: ${exclusions[*]}"

# Build -x arguments
x_args=()
for pattern in "${exclusions[@]}"; do
    x_args+=(-x "$pattern")
done
x_args+=(-x "$output_file")  # never zip the archive itself

info "Creating archive: $output_file"
debug "Full zip command: zip -r \"$output_file\" . ${x_args[*]}"

# Run zip - quiet unless verbose
if (( verbose )); then
    zip -r "$output_file" . "${x_args[@]}"
else
    zip -r "$output_file" . "${x_args[@]}" >/dev/null
fi

# Verify and report
if [[ -f "$output_file" ]]; then
    size=$(wc -c < "$output_file" | awk '{print $1}')
    printf "${GREEN}Success! Archive created: $output_file (${size} bytes)${RESET}\n"
    debug "Zip process completed successfully."
else
    printf "${RED}Error: Zip creation failed!${RESET}\n" >&2
    exit 1
fi