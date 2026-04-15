// // const { google } = require("googleapis");

// // /**
// //  * Authenticates using a service account JSON key from env variable.
// //  * Set GOOGLE_SERVICE_ACCOUNT_JSON in your .env (stringified JSON).
// //  * Set GOOGLE_DRIVE_FOLDER_ID to the target Drive folder ID.
// //  */
// // function getAuthClient() {
// //   const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
// //   return new google.auth.GoogleAuth({
// //     credentials,
// //     scopes: ["https://www.googleapis.com/auth/drive"],
// //   });
// // }

// // /**
// //  * Uploads a ZIP file buffer to Google Drive.
// //  * Organises files into a subfolder named after the client.
// //  *
// //  * @param {object} options
// //  * @param {string} options.fileName
// //  * @param {string} options.mimeType
// //  * @param {Buffer} options.buffer
// //  * @param {string} options.customerName
// //  * @param {string} options.rfqType
// //  * @param {string} options.category
// //  * @returns {{ fileId, fileName, fileUrl }}
// //  */
// // async function uploadToDrive({ fileName, mimeType, buffer, customerName, rfqType, category }) {
// //   const auth = getAuthClient();
// //   const drive = google.drive({ version: "v3", auth });

// //   const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

// //   // Find or create client subfolder inside the root folder
// //   const clientFolderId = await findOrCreateFolder(drive, customerName, rootFolderId);

// //   const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
// //   const uploadName = `${customerName}_${rfqType}_${category}_${timestamp}.zip`
// //     .replace(/\s+/g, "_");

// //   const { Readable } = require("stream");
// //   const stream = Readable.from(buffer);

// //   const response = await drive.files.create({
// //     requestBody: {
// //       name: uploadName,
// //       parents: [clientFolderId],
// //       description: `RFQ | Client: ${customerName} | Type: ${rfqType} | Category: ${category}`,
// //     },
// //     media: { mimeType, body: stream },
// //     fields: "id, name, webViewLink",
// //   });

// //   const { id: fileId, name: uploadedName, webViewLink } = response.data;

// //   // Make file readable by anyone with link (optional - remove if private)
// //   await drive.permissions.create({
// //     fileId,
// //     requestBody: { role: "reader", type: "anyone" },
// //   });

// //   return {
// //     fileId,
// //     fileName: uploadedName,
// //     fileUrl: webViewLink,
// //     folderId: clientFolderId,
// //   };
// // }

// // /**
// //  * Finds an existing folder by name under a parent, or creates it.
// //  */
// // async function findOrCreateFolder(drive, folderName, parentId) {
// //     if (!folderName) {
// //     throw new Error("folderName (customerName) is undefined");
// //   }
// //   const safeName = folderName.replace(/'/g, "\\'");
// //   const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${parentId}' in parents and trashed=false`;

// //   const list = await drive.files.list({ q: query, fields: "files(id, name)" });
// //   if (list.data.files.length > 0) return list.data.files[0].id;

// //   const folder = await drive.files.create({
// //     requestBody: {
// //       name: folderName,
// //       mimeType: "application/vnd.google-apps.folder",
// //       parents: [parentId],
// //     },
// //     fields: "id",
// //   });
// //   return folder.data.id;
// // }

// // module.exports = { uploadToDrive };


// const { google } = require("googleapis");
// const { Readable } = require("stream");

// function getAuthClient() {
//   const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
//   return new google.auth.GoogleAuth({
//     credentials,
//     scopes: ["https://www.googleapis.com/auth/drive"],
//   });
// }

// async function uploadToDrive({ fileName, mimeType, buffer, customerName, rfqType, category }) {
//   const auth = getAuthClient();
//   const drive = google.drive({ version: "v3", auth });

//   const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // Must be inside a Shared Drive

//   // Find or create client subfolder — result is now actually used ✅
//   const clientFolderId = await findOrCreateFolder(drive, customerName, rootFolderId);

//   const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//   const uploadName = `${customerName}_${rfqType}_${category}_${timestamp}.zip`
//     .replace(/\s+/g, "_");

//   const stream = Readable.from(buffer);

//   const response = await drive.files.create({
//     requestBody: {
//       name: uploadName,
//       parents: [clientFolderId], // ✅ uses the computed folder, not a hardcoded ID
//       description: `RFQ | Client: ${customerName} | Type: ${rfqType} | Category: ${category}`,
//     },
//     media: { mimeType, body: stream },
//     supportsAllDrives: true,         // ✅ required for Shared Drive
//     includeItemsFromAllDrives: true, // ✅ required for Shared Drive
//     fields: "id, name, webViewLink",
//   });

//   const { id: fileId, name: uploadedName, webViewLink } = response.data;

//   await drive.permissions.create({
//     fileId,
//     requestBody: { role: "reader", type: "anyone" },
//     supportsAllDrives: true, // ✅ also needed here
//   });

//   return {
//     fileId,
//     fileName: uploadedName,
//     fileUrl: webViewLink,
//     folderId: clientFolderId,
//   };
// }

// async function findOrCreateFolder(drive, folderName, parentId) {
//   if (!folderName) {
//     throw new Error("folderName (customerName) is undefined");
//   }

//   const safeName = folderName.replace(/'/g, "\\'");
//   const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${parentId}' in parents and trashed=false`;

//   const list = await drive.files.list({
//     q: query,
//     fields: "files(id, name)",
//     supportsAllDrives: true,         // ✅
//     includeItemsFromAllDrives: true, // ✅
//   });

//   if (list.data.files.length > 0) return list.data.files[0].id;

//   const folder = await drive.files.create({
//     requestBody: {
//       name: folderName,
//       mimeType: "application/vnd.google-apps.folder",
//       parents: [parentId],
//     },
//     supportsAllDrives: true, // ✅
//     fields: "id",
//   });

//   return folder.data.id;
// }

// module.exports = { uploadToDrive };


const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const TOKEN_PATH = path.join(__dirname, "../token.json");

// Create OAuth client
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:4000/oauth2callback"
  );
}

// Get authenticated client
async function getAuthClient() {
  const oAuth2Client = createOAuthClient();

  if (!fs.existsSync(TOKEN_PATH)) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive"],
    });

    console.log("\n🔗 AUTHORIZE THIS APP:\n", authUrl);
    throw new Error("Authorize app first using the URL above.");
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

// Upload file to Drive
async function uploadToDrive({ fileName, mimeType, buffer, customerName, rfqType, category }) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Create or get customer folder
  const clientFolderId = await findOrCreateFolder(drive, customerName, rootFolderId);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uploadName = `${customerName}_${rfqType}_${category}_${timestamp}.zip`
    .replace(/\s+/g, "_");

  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: uploadName,
      parents: [clientFolderId],
      description: `RFQ | ${customerName} | ${rfqType} | ${category}`,
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, name, webViewLink",
  });

  return {
    fileId: response.data.id,
    fileName: response.data.name,
    fileUrl: response.data.webViewLink,
    folderId: clientFolderId,
  };
}

// Find or create folder
async function findOrCreateFolder(drive, folderName, parentId) {
  if (!folderName) {
    throw new Error("customerName is required");
  }

  const safeName = folderName.replace(/'/g, "\\'");

  const query = `
    mimeType='application/vnd.google-apps.folder' 
    and name='${safeName}' 
    and '${parentId}' in parents 
    and trashed=false
  `;

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return folder.data.id;
}

module.exports = {
  uploadToDrive,
  createOAuthClient, // needed for callback route
};