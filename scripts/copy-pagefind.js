const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, '..', 'dist', 'pagefind');
const destDir = path.join(__dirname, '..', 'public', 'pagefind');

// Function to clean directory
function cleanDirectory(dir) {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                cleanDirectory(filePath);
                fs.rmdirSync(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        }
    }
}

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
} else {
    // Clean the destination directory before copying
    cleanDirectory(destDir);
}

// Function to copy a file
function copyFile(source, destination) {
    try {
        fs.copyFileSync(source, destination);
        console.log(`Copied: ${path.basename(source)}`);
    } catch (error) {
        console.error(`Error copying ${source}:`, error);
    }
}

// Function to copy all files from a directory
function copyDirectory(source, destination) {
    if (!fs.existsSync(source)) {
        console.error(`Source directory does not exist: ${source}`);
        return;
    }

    const files = fs.readdirSync(source);
    
    for (const file of files) {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyDirectory(sourcePath, destPath);
        } else {
            copyFile(sourcePath, destPath);
        }
    }
}

// Main execution
console.log('Starting PageFind files copy...');
copyDirectory(sourceDir, destDir);
console.log('PageFind files copy completed!'); 