const express = require("express");
const bodyParser = require("body-parser");
const pinataSDK = require("@pinata/sdk");
const multer = require("multer");
const fs = require("fs");

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const path = require("path");

const imageStorage = multer.diskStorage({
  // Destination to store image
  destination: "images",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + path.extname(file.originalname));
    // file.fieldname is name of the field (image)
    // path.extname get the uploaded file extension
  },
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const pinata = pinataSDK(
  "6aff73d61f9a9377963c",
  "5fe4bd174a6d80b442b67116f479e40aa6e53ec7a62ff9c8e6f3ff719d7363bb"
);

pinata
  .testAuthentication()
  .then((result) => {
    //handle successful authentication here
    console.log(result);
  })
  .catch((err) => {
    //handle error here
    console.log(err);
  });

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 30000000, // 30000000 Bytes = 30 MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|jpeg|gif|mp4)$/)) {
      // upload only png and jpg format
      return cb(new Error("Please upload a Image"));
    }
    cb(undefined, true);
  },
});

app.post("/pinata_upload", imageUpload.single("image"), async (req, res) => {
  var data = req.body;
  console.log("Request Headers", req.headers);
  const file = req.file;
  console.log("server side: ", file);
  try {
    const P = file.path;
    var readableStreamForFile = fs.createReadStream(P);
    console.log(typeof readableStreamForFile);
    var options = {
      pinataMetadata: {
        name: `${data.name}.img`,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };
    try {
      var result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    } catch (e) {
      console.log(e, "error");
    }
    console.log(result);
    data.image = "https://unicus.mypinata.cloud/ipfs/" + result.IpfsHash;
    console.log(data);
    options = {
      pinataMetadata: {
        name: `${data.name}.json`,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    try {
      result = await pinata.pinJSONToIPFS(data, options);
    } catch (e) {
      console.log(e, "error");
    }
    console.log(result);
    res.send(result.IpfsHash);
  } catch (err) {
    console.log(err);
    return res.send(err);
  }

  // res.send("success");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Live on 5000 port");
});
