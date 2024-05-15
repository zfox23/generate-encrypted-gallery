# generate-encrypted-gallery

You can decrypt and view photo galleries generated using this tool at [https://zachfox.photography/viewer/](https://zachfox.photography/viewer/).

## Prerequisites
1. Install [NodeJS](https://nodejs.org/en/download)
    - I'm using v18.18.0, but the latest version should work fine.
2. Using a command prompt, `cd` into this directory
3. Run `npm i` to install this tool's dependencies

## Usage
### Generate an Encrypted Gallery
To encrypt your photos and generate an encrypted gallery `.json` file:

1. Copy the images you'd like to encrypt into `./in`.
2. Using a command prompt, `cd` into this directory.
3. Run `node index.js --name="Gallery Name" --key=SecretKey`
4. Upload the `./out/Gallery Name/` folder to your Web host of choice.
5. Navigate to [https://zachfox.photography/viewer/](https://zachfox.photography/viewer/).
6. Paste the URL to your uploaded `Gallery Name/gallery.json.encrypted` in the "Encrypted Gallery URL" input field.
7. Paste your secret key in the "Gallery Password" field.

### Decrypt an Encrypted Gallery Locally
To decrypt a gallery you previously encrypted using this tool:

1. Using a command prompt, `cd` into this directory.
2. Run `node index.js --name="Gallery Name" --key=SecretKey -D`

Your decrypted gallery images and gallery configuration file will be output to `./out/Gallery Name/decrypted/`.

## Goals

- I want my high-resolution private photos to be accessible to trusted people.
- I do not want to post my pictures on Google Photos or Facebook or a similar service hosted by a large corporation.
- I don't want anyone with access to an original photo URL to be able to view the photos.
    - Consider Facebook, where anyone can see your private photos if they have access to the photo's URL. [Here's a personal example.](https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/289784879_10219950823060945_6797258258094706899_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=5f2048&_nc_ohc=zowOrbu8qbsQ7kNvgHcfdEK&_nc_ht=scontent-lga3-1.xx&oh=00_AYDwuTR8p853VXbyhdvHEeDei-wT_Nw0utx01O-ibhqBdw&oe=664AE7FE)
- I want the benefits of privacy and end-to-end encryption to be understandable by more folks.

To achieve these goals, I built `generate-encrypted-gallery` and the associated viewer at [https://zachfox.photography/viewer/](https://zachfox.photography/viewer/).
