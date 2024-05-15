const fs = require("fs");
const path = require("path");
const exifr = require("exifr");
const sharp = require('sharp');
const crypto = require('node:crypto').webcrypto;

const getArgs = () => {
    if (!process.argv) return {};

    return process.argv.reduce((args, arg) => {
        // long arg
        if (arg.slice(0, 2) === "--") {
            const longArg = arg.split("=");
            const longArgFlag = longArg[0].slice(2);
            const longArgValue = longArg.length > 1 ? longArg[1] : true;
            args[longArgFlag] = longArgValue;
        }
        // flags
        else if (arg[0] === "-") {
            const flags = arg.slice(1).split("");
            flags.forEach((flag) => {
                args[flag] = true;
            });
        }
        return args;
    }, {});
}


const concatBuffer = (buffer1, buffer2) => {
    let tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
};
const buf2hex = (buffer) => { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}


const algorithm = 'AES-GCM';
const ivNumBytes = 16;
const encrypt = async (buffer, password) => {
    // encode password as UTF-8
    const pwUtf8 = new TextEncoder().encode(password);
    // hash the password
    const pwHash = await crypto.subtle.digest("SHA-256", pwUtf8);
    // get 128-bit random iv
    const iv = crypto.getRandomValues(new Uint8Array(ivNumBytes));
    // specify algorithm to use
    const alg = { name: algorithm, iv: iv };
    // generate key from pw
    const key = await crypto.subtle.importKey("raw", pwHash, alg, false, ["encrypt"]);
    // encrypt buffer using key
    const encryptedArrayBuffer = await crypto.subtle.encrypt(alg, key, buffer);
    const encryptedArrayBufferDigest = buf2hex(await crypto.subtle.digest("SHA-256", buffer));

    return {
        encryptedArrayBuffer: concatBuffer(iv, encryptedArrayBuffer),
        encryptedArrayBufferDigest
    }
};
const decrypt = async (encryptedArrayBuffer, password) => {
    // encode password as UTF-8
    const pwUtf8 = new TextEncoder().encode(password);
    // hash the password
    const pwHash = await crypto.subtle.digest("SHA-256", pwUtf8);
    // decode base64 iv
    const iv = encryptedArrayBuffer.slice(0, 16);
    // specify algorithm to use
    const alg = { name: algorithm, iv: iv };
    // generate key from pw
    const key = await crypto.subtle.importKey("raw", pwHash, alg, false, ["decrypt"]);
    const encryptedData = encryptedArrayBuffer.slice(16);
    const result = await crypto.subtle.decrypt(
        {
            name: algorithm,
            iv: iv
        },
        key,
        encryptedData
    );
    return result;
};










const augmentCameraBody = (originalCameraBody) => {
    switch (originalCameraBody) {
        case "SM-S908U1":
            return "Samsung Galaxy S22 Ultra";
        case "FC3682":
            return "DJI Mini 3";
        case "FC8482":
            return "DJI Mini 4 Pro";
    }

    return originalCameraBody;
}
const augmentLensModel = (originalLensModel) => {
    switch (originalLensModel) {
        case "EF16-35mm f/4L IS USM":
            return "Canon EF16-35mm f/4L IS USM";
        case "RF24-70mm F2.8 L IS USM":
            return "Canon RF24-70mm f/2.8 L IS USM";
        case "EF70-200mm f/4L IS II USM":
            return "Canon EF70-200mm f/4L IS II USM";
        case "EF100mm f/2.8L Macro IS USM":
            return "Canon EF100mm f/2.8L Macro IS USM";
        case "150-600mm F5-6.3 DG OS HSM | Contemporary 015":
            return "Sigma EF150-600mm f/5-6.3 DG OS HSM C";
        case "Samsung Galaxy S22 Ultra Rear Wide Camera":
            return "S22 Ultra Rear Wide";
        case "Samsung Galaxy S22 Ultra Rear Ultrawide Camera":
            return "S22 Ultra Rear Ultrawide";
        case "iPhone 12 Pro back triple camera 4.2mm f/1.6":
            return "iPhone 12 Pro Rear Wide (26mm Equivalent)";
        case "Pixel 6 Pro back camera 6.81mm f/1.85":
            return "Pixel 6 Pro Rear Wide (25mm Equivalent)";
        case "20.7 mm":
            return "DJI Mini 3 Drone Camera";
        case "24.0 mm f/1.7":
            return "DJI Mini 4 Pro Drone Camera";
        case "RF5.2mm F2.8 L DUAL FISHEYE":
            return "Canon RF5.2mm f/2.8L Dual Fisheye";
    }

    return originalLensModel;
}
const getLensModelHref = (originalLensModel) => {
    switch (originalLensModel) {
        case "EF16-35mm f/4L IS USM":
            return "https://amzn.to/3uH9GV7";
        case "RF24-70mm F2.8 L IS USM":
            return "https://amzn.to/3umgHdN";
        case "EF70-200mm f/4L IS II USM":
            return "https://amzn.to/3F35TWQ";
        case "EF100mm f/2.8L Macro IS USM":
            return "https://amzn.to/3X7aj7a";
        case "150-600mm F5-6.3 DG OS HSM | Contemporary 015":
            return "https://amzn.to/3XlfVuy";
        case "Samsung Galaxy S22 Ultra Rear Wide Camera":
        case "Samsung Galaxy S22 Ultra Rear Ultrawide Camera":
            return "https://amzn.to/3HDSTt5";
        case "iPhone 12 Pro back triple camera 4.2mm f/1.6":
            return "https://www.gsmarena.com/apple_iphone_12_pro-10508.php";
        case "Pixel 6 Pro back camera 6.81mm f/1.85":
            return "https://www.gsmarena.com/google_pixel_6_pro-10918.php";
        case "20.7 mm":
            return "https://amzn.to/48tSMvH";
        case "24.0 mm f/1.7":
            return "https://amzn.to/477IHmN";
        case "RF5.2mm F2.8 L DUAL FISHEYE":
            return "https://amzn.to/4dlyIhv";
    }

    return "https://amzn.to/3UZ6ajO";
}
const augmentFocalLength = (originalFocalLength) => {
    if (originalFocalLength > 600) {
        return `${originalFocalLength}mm (Digitally Zoomed)`;
    } else {
        return `${originalFocalLength}mm`;
    }
}
const augmentAperture = (originalFNumber) => {
    return `ƒ/${originalFNumber}`;
}
const augmentExposureTime = (inputPath, originalExposureTime) => {
    if (!originalExposureTime) {
        return `Unknown`;
    }

    switch (originalExposureTime) {
        case 0.03333333333333333:
            return `1/30s`;
        case 0.025:
            return `1/40s`;
        case 0.016666666666666666:
            return `1/60s`;
        case 0.01:
            return `1/100s`;
        case 0.1:
            return `1/10s`;
        case 0.002:
            return `1/500s`;
        case 0.02:
            return `1/50s`;
        case 0.005:
            return `1/200s`;
        case 0.0025:
            return `1/400s`;
        case 0.00125:
            return `1/800s`;
        case 0.008333333333333333:
            return `1/120s`;
        case 0.008:
            return `1/125s`;
        case 0.00625:
            return `1/160s`;
        case 0.0125:
            return `1/80s`;
        case 0.004:
            return `1/250s`;
        case 0.04:
            return `1/25s`;
        case 0.05:
            return `1/20s`;
        case 0.16666666666666666:
            return `1/6s`;
        case 0.06666666666666667:
            return `1/15s`;
        case 0.25:
            return `1/4s`;
        case 0.2:
            return `1/5s`;
        case 0.07692307692307693:
            return `1/13s`;
        case 0.0015625:
            return `1/640s`;
        case 0.003125:
            return `1/320s`;
        case 0.005555555555555556:
            return `1/180s`;
        case 0.0003125:
            return `1/3200s`;
        case 0.001:
            return `1/1000s`;
        case 0.0008:
            return `1/1250s`;
        case 0.0005:
            return `1/2000s`;
        case 0.000625:
            return `1/1600s`;
        case 0.0004:
            return `1/2500s`;
        case 0.0033333333333333335:
            return `1/300s`;
        case 0.125:
            return `1/8s`;
        case 0.004166666666666667:
            return `1/240s`;
        case 0.0003333333333333333:
            return `1/3000s`;
        case 0.0014705882352941176:
            return `1/680s`;
        case 0.004347826086956522:
            return `1/230s`;
        case 0.4:
            return `0.4s`;
        case 0.00015625:
            return `1/6400s`;
        case 0.000588235294117647:
            return `1/1700s`;
        case 13:
            return `13s`;
        case 30:
            return `30s`;
        case 0.3:
            return `0.3s`;
        case 0.6:
            return `0.6s`;
        case 0.5:
            return `0.5s`;
        case 0.02857142857142857:
            return `1/35s`;
        case 0.011111111111111112:
            return `1/90s`;
        case 0.006666666666666667:
            return `1/150s`;
        case 0.014285714285714285:
            return `1/70s`;
        case 8:
            return `8s`;
        case 1:
            return `1s`;
        case 3.2:
            return `3.2s`;
        case 2.5:
            return `2.5s`;
        case 4:
            return `4s`;
        case 0.8:
            return `0.8s`;
        case 25:
            return `25s`;
        case undefined:
            return `Unknown`;
        case 10:
            return `10s`;
        case 20:
            return `20s`;
        case 0.000125:
            return `1/8000s`;
        case 0.3333333333333333:
            return `1/3s`;
        case 0.00025:
            return `1/4000s`;
        case 1.3:
            return `1.3s`;
        case 2:
            return `2s`;
        case 0.00016666666666666666:
            return `1/6000s`;
        case 0.0006666666666666666:
            return `1/1500s`;
        case 0.0083337:
            return `1/120s`;
    }
    console.log(`${inputPath}: Unhandled exposure time: ${originalExposureTime}`);

    return `${originalExposureTime?.toFixed(6)}s`;
}
const formatDateTime = (dto, offsetTimeOriginal, timeZoneString = " EDT") => {
    if (!dto) {
        return null;
    }

    let d = new Date(dto.getFullYear(), dto.getMonth(), dto.getDate(), dto.getHours(), dto.getMinutes(), dto.getSeconds()),
        month = (d.getMonth() + 1).toString(),
        day = d.getDate().toString(),
        year = d.getFullYear();

    if (month.length < 2) {
        month = '0' + month;
    }
    if (day.length < 2) {
        day = '0' + day;
    }

    const dayOfWeek = dto.getDay();
    let dayOfWeekString;
    switch (dayOfWeek) {
        case 0:
            dayOfWeekString = "Sun";
            break;
        case 1:
            dayOfWeekString = "Mon";
            break;
        case 2:
            dayOfWeekString = "Tue";
            break;
        case 3:
            dayOfWeekString = "Wed";
            break;
        case 4:
            dayOfWeekString = "Thu";
            break;
        case 5:
            dayOfWeekString = "Fri";
            break;
        case 6:
            dayOfWeekString = "Sat";
            break;
    }

    const yearString = [year, month, day].join('-');

    let hours = d.getHours().toString();
    if (hours.length < 2) {
        hours = '0' + hours;
    }
    let minutes = d.getMinutes().toString();
    if (minutes.length < 2) {
        minutes = '0' + minutes;
    }
    let seconds = d.getSeconds().toString();
    if (seconds.length < 2) {
        seconds = '0' + seconds;
    }
    const timeString = [hours, minutes, seconds].join(':');

    const finalString = [dayOfWeekString, yearString, timeString].join(' ') + timeZoneString;

    return { dateTimeString: finalString, dateTimeObject: d };
}
const getExifData = async (inputFilename, inputPath) => {
    let exif;
    try {
        exif = await exifr.parse(inputPath);
    } catch (e) {
        console.error(`Couldn't \`exifr.parse(${inputPath})\` \`:\n${e}`);
    }
    const originalLensModel = exif ? exif["LensModel"] : undefined;
    const originalFocalLength = exif ? exif["FocalLength"] : undefined;
    const originalAperture = exif ? exif["FNumber"] : undefined;
    const originalExposureTime = exif ? exif["ExposureTime"] : undefined;
    const originalImageDescription = exif ? exif["ImageDescription"] : undefined;

    let location = [];
    if (exif && exif["latitude"] && exif["longitude"]) {
        location = [exif["latitude"], exif["longitude"]];
    }

    const formattedDateTime = formatDateTime(exif && exif["DateTimeOriginal"], exif && exif["OffsetTimeOriginal"], "");
    if (!formattedDateTime) {
        console.error(`Invalid formattedDateTime for \`${inputPath}\`: ${formattedDateTime}`);
        return;
    }
    const time = formattedDateTime.dateTimeObject.getTime();
    if (!time) {
        console.error(`Invalid time for \`${inputPath}\`: ${time}`);
        return;
    }

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const isVertical = exif["Orientation"] && (exif["Orientation"].includes("Rotate 90") || exif["Orientation"].includes("Rotate 270"));

    return {
        "originalFilename": inputFilename,
        "location": location,
        "cameraBody": augmentCameraBody(exif && exif["Model"]),
        "lensModel": augmentLensModel(originalLensModel),
        "lensModelHref": getLensModelHref(originalLensModel),
        "focalLength": augmentFocalLength(originalFocalLength),
        "aperture": augmentAperture(originalAperture),
        "exposureTime": augmentExposureTime(inputPath, originalExposureTime),
        "iso": exif["ISO"],
        ...formattedDateTime,
        "presentedResolution": `${metadata.width}x${metadata.height}px`,
        "widthPx": isVertical ? metadata.height : metadata.width,
        "heightPx": isVertical ? metadata.width : metadata.height,
    }
}








const generateEncryptedGallery = async (password, galleryName) => {
    const INPUT_DIR = path.join(__dirname, "in");
    const OUTPUT_DIR = path.join(__dirname, "out", galleryName);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }

    console.log(`Output directory for encrypted gallery is: \`${OUTPUT_DIR}\``);

    let filenames;
    try {
        filenames = fs.readdirSync(INPUT_DIR);
    } catch (e) {
        console.error(`Couldn't \`readdirSync()\`:\n${e}`);
    }

    let outputJson = {
        "title": galleryName,
        "images": []
    };

    for (let i = 0; i < filenames.length; i++) {
        const inputFilename = filenames[i];
        const inputPath = path.join(INPUT_DIR, inputFilename);
        const isDir = fs.statSync(inputPath).isDirectory();
        if (inputFilename.endsWith(".DS_Store") || inputFilename === "!README.md" || isDir) {
            continue;
        }

        const buffer = fs.readFileSync(inputPath);
        const { encryptedArrayBuffer, encryptedArrayBufferDigest } = await encrypt(buffer, password);
        const encryptedSrc = `${encryptedArrayBufferDigest}.encrypted`;
        console.log(`\`${inputFilename}\` -> \`${encryptedSrc}\``);
        fs.writeFileSync(path.join(OUTPUT_DIR, encryptedSrc), encryptedArrayBuffer);

        const thumb = sharp(inputPath)
            .resize(512, 512, {
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .jpeg({ quality: 90, mozjpeg: true })
            .withMetadata()

        const thumbBuffer = await thumb.toBuffer();
        const { encryptedArrayBuffer: encryptedThumb } = await encrypt(thumbBuffer, password);
        const encryptedThumbSrc = `${encryptedArrayBufferDigest}.thumb.encrypted`;
        fs.writeFileSync(path.join(OUTPUT_DIR, encryptedThumbSrc), encryptedThumb);


        let exif = await getExifData(inputFilename, inputPath);

        let newJson = {
            "encryptedSrc": encryptedSrc,
            "encryptedThumbSrc": encryptedThumbSrc,
            "alt": "",
            "caption": new Date(exif.dateTimeObject).toLocaleDateString(),
            "mapInitialZoom": 18,
            "exif": exif
        }

        if (exif && exif.widthPx === exif.heightPx * 2 && exif.lensModel === "Canon RF5.2mm f/2.8L Dual Fisheye") {
            newJson["type"] = "stereoLR180";
        }

        outputJson.images.push(newJson)
    }

    outputJson.images.sort((a, b) => {
        return b.exif?.dateTimeObject - a.exif?.dateTimeObject;
    })

    const { encryptedArrayBuffer: encryptedJson } = await encrypt(Buffer.from(JSON.stringify(outputJson)), password);
    const outputJsonFilepath = path.join(OUTPUT_DIR, "gallery.json.encrypted");
    fs.writeFileSync(outputJsonFilepath, Buffer.from(encryptedJson));
    console.log(`Gallery JSON written to: \`${outputJsonFilepath}\``)
}

const decryptGallery = async (password, galleryName) => {
    const INPUT_DIR = path.join(__dirname, "out", galleryName);
    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`\`${INPUT_DIR}\` does not exist!`);
        return;
    }

    const OUTPUT_DIR = path.join(INPUT_DIR, "decrypted");

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }

    console.log(`Output directory containing *decrypted* gallery images is: \`${OUTPUT_DIR}\``);

    let filenames;
    try {
        filenames = fs.readdirSync(INPUT_DIR);
    } catch (e) {
        console.error(`Couldn't \`readdirSync()\`:\n${e}`);
    }

    for (let i = 0; i < filenames.length; i++) {
        const inputFilename = filenames[i];
        const inputPath = path.join(INPUT_DIR, inputFilename);
        const isDir = fs.statSync(inputPath).isDirectory();
        if (inputFilename.endsWith(".DS_Store") || inputFilename === "!README.md" || isDir) {
            continue;
        }

        const buffer = fs.readFileSync(inputPath);
        const decryptedBuffer = await decrypt(buffer, password);
        let outputFilename;
        if (inputFilename === "gallery.json.encrypted") {
            outputFilename = inputFilename.replace(".encrypted", "");
            fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), await Buffer.from(decryptedBuffer).toString());
        } else {
            outputFilename = inputFilename.replace(".encrypted", ".jpg");
            fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), await Buffer.from(decryptedBuffer));
        }
        console.log(`\`${inputFilename}\` -> \`${outputFilename}\``);
    }
}

const args = getArgs();
if (args["key"] && args["name"] && args["D"]) {
    decryptGallery(args["key"], args["name"]);
} else if (args["key"] && args["name"]) {
    generateEncryptedGallery(args["key"], args["name"]);
} else {
    console.log(`Specify a key for encryption with \`--key=abcde\``);
    console.log(`Specify a gallery name with \`--name="Test Gallery"\``)
    return;
}

