# PowerShell script to zip the Boost folder contents, excluding examples folder, .gitignore, and README.md
# Run this in the Boost directory: C:\Users\Leon Lau\Documents\Boost

Write-Host "DEBUG: Starting zip process in current directory: $(Get-Location)" -ForegroundColor Green

# Define the output zip file
$zipFile = "Boost neo.zip"
Write-Host "DEBUG: Output zip file will be: $zipFile" -ForegroundColor Green

# Check if zip file already exists and remove it if so
if (Test-Path $zipFile) {
    Write-Host "DEBUG: Existing zip file found, removing it..." -ForegroundColor Yellow
    Remove-Item $zipFile -Force
}

# Define exclusions
$exclusions = @(
    ".gitignore",
    "examples", 
    "README.md",
    "AGENTS.md", 
    "zipper.zsh", 
    "zipper.ps1"
)

Write-Host "DEBUG: Exclusions: $($exclusions -join ', ')" -ForegroundColor Green

# Get items to include, excluding the specified ones
Write-Host "DEBUG: Gathering items to include..." -ForegroundColor Green
$itemsToInclude = Get-ChildItem -Exclude $exclusions
Write-Host "DEBUG: Items to include: $($itemsToInclude.Name -join ', ')" -ForegroundColor Green

# Create the zip archive with the filtered items
Write-Host "DEBUG: Creating zip archive..." -ForegroundColor Green
$itemsToInclude | Compress-Archive -DestinationPath $zipFile -CompressionLevel Optimal

# Verify the zip was created
if (Test-Path $zipFile) {
    $zipSize = (Get-Item $zipFile).Length
    Write-Host "DEBUG: Zip created successfully! Size: $zipSize bytes" -ForegroundColor Green
} else {
    Write-Host "ERROR: Zip creation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "DEBUG: Zip process completed." -ForegroundColor Green