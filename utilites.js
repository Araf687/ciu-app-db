const compress_images = require("compress-images");
const compImg=(inputPath,outputPath)=>{

  compress_images(inputPath, outputPath, { compress_force: false, statistic: true, autoupdate: true }, false,
                  { jpg: { engine: "mozjpeg", command: ["-quality", "60"] } },
                  { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
                  { svg: { engine: "svgo", command: "--multipass" } },
                  { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
    function (error, completed, statistic) {
      console.log("-------------");
      console.log(error);
      console.log(completed);
      console.log(statistic);
      console.log("-------------");
    }
  );
}

// add the code below
module.exports = { compImg };