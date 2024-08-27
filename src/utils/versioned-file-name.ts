import * as fs from 'fs';
import * as path from 'path';


function getVersionedFileName(baseName: string, dir: string, extension: string): string {
    let version = 0;
    let fileName = `${baseName}.${extension}`;
    while (fs.existsSync(path.join(dir, fileName))) {
      version += 1;
      fileName = `${baseName}_v${version}.${extension}`;
    }
    return fileName;
}


export default getVersionedFileName