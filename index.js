const express = require("express");
const PORT = process.env.PORT || 6868;
const server = express();
const upload = require("express-fileupload");
const fs = require("fs");
const { execSync } = require("child_process");
const ptp = require("pdf-to-printer");
const portfinder = require('portfinder');

server.use(upload());
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

//get list printer in computer
server.get("/printers", async (req, res) => {
  let printers = [];
  try {
    let stdout = execSync("wmic printer list brief", { encoding: "ascii" });
    stdout = stdout.split("  ");
    // let printers = [];
    let j = 0;
    stdout = stdout.filter(item => item);
    for (let i = 0; i < stdout.length; i++) {
        if (stdout[i] == " \r\r\n" || stdout[i] == "\r\r\n" || stdout[i].includes("\r\r\n") || stdout[i].includes(" \r\r\n")) {
            if(stdout[i + 1] !== undefined && stdout[i + 1] !== null){
            const resultPrinterName = stdout[i + 1].trim();
            const resultPrinterNameArray = resultPrinterName.split('')
            if(resultPrinterNameArray[0] === "\\" && resultPrinterNameArray[1] === "\\"){
              resultPrinterNameArray.shift();
            }
              printers[j] = {name: resultPrinterNameArray.toString().replaceAll(',', '').trim()}
        }
            j++;
        }
    }

    return res.status(200).send({
      success: true,
      message: "success get list printer",
      body: printers,
    });
  } catch {
    return res.status(400).send({
      success: false,
      message: "err when get list printer cc",
      body: null,
    });
  }
});

  function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

 async function getIp (){
  let ipSuccess = "Máy tính hiện đang không có kết nối mạng"
    // Lay ket qua ip config 
    const resCmdGetIp = execSync("ipconfig", { encoding: "ascii" });
    var list = resCmdGetIp.split("\r\n")
    // Cắt chuỗi xử lý khoảng trắng
    for (let i = 0; i < list.length; i++) {
      list[i] = list[i].trim();
      if(i === 0){
        await timeout(1000);
      }
    }
    for (let i = 0; i < list.length; i++) {
      const element = list[i];
      if(element.startsWith("Default Gateway"))
      {
        // LẤy được dòng chua Default Gateway
        var index = element.indexOf(": ");
        if (index !== -1) {
          // Lấy cụm mà chưa thông tin caafn lấy
          for (let j = i - 1; j >= 0; j--) {
              const element_2 = list[j];
              if(element_2.startsWith("IPv4 Address"))
              {
                  var index_2 = element_2.indexOf(": ");
                  var ip = element_2.substring(index_2 + 2, element_2.length);
                  ipSuccess = ip
                  break;
              }
          }
          break;
        }
      }
    }
  return ipSuccess
}

//get ip address
server.get("/get-ip-address", async (req, res) => {
  try {
    const ip_res = await getIp()
    res.status(200).send({ status: true, data: ip_res });

  } catch {
    res.status(505).send({ status: false, data: null });
  }
});

//print post file
server.post('/print', (req, res) => {
    const pdf_folder = "C:\\"
    const pdf_folder_fullPath = "C:\\pdf_folder\\"
    const printerName = req.body.namePrinter
    if (req.files.pdfFile, printerName) {
        const fileName = req.files.pdfFile.name
        const pathFilePrint = `${pdf_folder_fullPath}${fileName}`
        const saveAndPrint = () => {
          req.files.pdfFile.mv(pdf_folder_fullPath + fileName, (err) => {
            if (err) {
                return res.status(404).send({ success: false, mess: "err when save file upload" })
            }
            else {
                // print in win32
              try { 
                const stringPrintInWin = `printto "${pathFilePrint}" "${printerName}"`
                const resPrinterInWin = execSync(stringPrintInWin, { encoding: "ascii" });
                return res.status(200).send({success : true, mess:"print file success in windows"})
              } catch {
                return res.status(404).send({success : false, mess:"err"})
              }
            }
        })
        }
        if (fs.existsSync(pdf_folder_fullPath)) {
          saveAndPrint()
        } else {
            // tạo forder
            fs.mkdir(path.join(pdf_folder, 'pdf_folder'), (err) => {
              if (err) {
                  return console.error(err);
              }
              saveAndPrint()
          });
        }
    } else {
        return res.status(500).send({ success: false, mess: "upload file err" })
    }
})

// electron ui
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    icon: __dirname + "/vt_logo.png",
  });

  win.loadFile("index.html");
}

function createNotityErr() {
  const win = new BrowserWindow({
    width: 400,
    height: 270,
    icon: __dirname + "/vt_logo.png",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("err.html");
}
app.whenReady().then(() => {
  var splash = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: __dirname + "/vt_logo.png",
    });
    splash.loadFile('splash.html');
    

    portfinder.getPort({
      port: 6868,    // minimum port
      stopPort: 6868 // maximum port
    }, async function (err){
      await timeout(2000);
      splash.close();
      if(err){
        createNotityErr();
        app.on("activate", () => {
          if (BrowserWindow.getAllWindows().length === 0) {
            createNotityErr();
          }
        })
        return
      }
      server.listen(PORT, "0.0.0.0", function(){
        console.log("Listening to port:  " + PORT);
      })
      createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      })
  });
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
