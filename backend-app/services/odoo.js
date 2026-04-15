const axios = require("axios");

// ENV
const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

let SESSION_ID = null;

/**
 * Get session
 */
async function getSessionId() {
  if (SESSION_ID) return SESSION_ID;

  const response = await axios.post(`${ODOO_URL}/web/session/authenticate`, {
    jsonrpc: "2.0",
    method: "call",
    params: {
      db: ODOO_DB,
      login: ODOO_USERNAME,
      password: ODOO_API_KEY,
    },
  });

  const cookies = response.headers["set-cookie"];
  const sessionCookie = cookies?.find((c) => c.startsWith("session_id="));

  if (!sessionCookie) {
    throw new Error("Failed to get session_id");
  }

  SESSION_ID = sessionCookie.split(";")[0].replace("session_id=", "");
  return SESSION_ID;
}

/**
 * Generic Odoo call
 */
async function odooCall(model, method, args = [], kwargs = {}) {
  const sessionId = await getSessionId();

  const response = await axios.post(
    `${ODOO_URL}/web/dataset/call_kw`,
    {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model,
        method,
        args,
        kwargs,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionId}`,
      },
    }
  );

  if (response.data.error) {
    throw new Error(JSON.stringify(response.data.error));
  }

  return response.data.result;
}

/**
 * ✅ CREATE PROJECT
 */
async function createProject(customerName) {
  const projectName = `${customerName} - RFQ`;

  const projectId = await odooCall("project.project", "create", [
    {
      name: projectName,
    },
  ]);

  return {
    projectId,
    projectName,
  };
}

async function createTask(TaskName, projectId , description) {
  const Task = `${TaskName}`;

  const taskId = await odooCall("project.task", "create", [
    {
      name: Task,
      project_id: projectId,
      description
    },
  ]);

  return {
    taskId,
    taskName : TaskName
  };
}


async function createProjectDummy(customerName) {
  return {
    projectId: Math.floor(Math.random() * 1000), // random ID
    projectName: `${customerName} - RFQ`,
    status: "created",
    source: "dummy",
  };
}

module.exports = {
  createProject, createProjectDummy, createTask
};


// const axios = require("axios");

// /**
//  * Odoo JSON-RPC helper.
//  * Env vars required:
//  *   ODOO_URL       - e.g. https://yourcompany.odoo.com
//  *   ODOO_DB        - your Odoo database name
//  *   ODOO_USERNAME  - your Odoo login email
//  *   ODOO_API_KEY   - Odoo API key (Settings > Technical > API Keys)
//  */

// const ODOO_URL = () => process.env.ODOO_URL;
// const ODOO_DB = () => process.env.ODOO_DB;
// const ODOO_USERNAME = () => process.env.ODOO_USERNAME;
// const ODOO_API_KEY = () => process.env.ODOO_API_KEY;

// async function odooCall(model, method, args, kwargs = {}) {
//   const response = await axios.post(`${ODOO_URL()}/web/dataset/call_kw`, {
//     jsonrpc: "2.0",
//     method: "call",
//     params: {
//       model,
//       method,
//       args,
//       kwargs: {
//         context: {},
//         ...kwargs,
//       },
//     },
//   }, {
//     headers: {
//       "Content-Type": "application/json",
//       Cookie: `session_id=${await getSessionId()}`,
//     },
//   });

//   if (response.data.error) {
//     throw new Error(`Odoo error: ${JSON.stringify(response.data.error)}`);
//   }
//   return response.data.result;
// }

// let _sessionId = null;
// let _sessionExpiry = 0;

// async function getSessionId() {
//   if (_sessionId && Date.now() < _sessionExpiry) return _sessionId;

//   const response = await axios.post(`${ODOO_URL()}/web/session/authenticate`, {
//     jsonrpc: "2.0",
//     method: "call",
//     params: {
//       db: ODOO_DB(),
//       login: ODOO_USERNAME(),
//       password: ODOO_API_KEY(),
//     },
//   });

//   if (!response.data.result?.uid) {
//     throw new Error("Odoo authentication failed. Check ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY.");
//   }

//   const cookies = response.headers["set-cookie"];
//   const sessionCookie = cookies?.find((c) => c.startsWith("session_id="));
//   _sessionId = sessionCookie?.split(";")[0]?.replace("session_id=", "");
//   _sessionExpiry = Date.now() + 30 * 60 * 1000; // 30 min cache

//   return _sessionId;
// }

// /**
//  * Finds an existing Odoo project by name, or creates a new one.
//  */
// async function findOrCreateProject(projectName) {
//   const existing = await odooCall("project.project", "search_read", [
//     [["name", "=", projectName]],
//   ], { fields: ["id", "name"], limit: 1 });

//   if (existing.length > 0) return existing[0];

//   const newId = await odooCall("project.project", "create", [{
//     name: projectName,
//     description: `Auto-created via RFQ submission portal`,
//     privacy_visibility: "employees",
//   }]);

//   return { id: newId, name: projectName };
// }

// /**
//  * Creates a task inside an Odoo project.
//  */
// // async function createTask({ projectId, taskName, description }) {
// // //   const taskId = await odooCall("project.task", "create", [{
// // //     name: taskName,
// // //     project_id: projectId,
// // //     description,
// // //     tag_ids: [],
// // //   }]);

// //   return taskId;
// // }

// async function createTask({SESSION_ID, projectId}) {
//     console.log(SESSION_ID ,"createTask");
    
//   try {
//     const response = await axios.post(
//       `https://flair-labs.odoo.com/web/dataset/call_kw`,
//       {
//         jsonrpc: "2.0",
//         method: "call",
//         params: {
//           model: "project.task",
//           method: "create",
//           args: [
//             {
//               name: "Task-001",
//               project_id: projectId,
//             },
//           ],
//           kwargs: {},
//         },
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Cookie: `session_id=${SESSION_ID}`,
//         },
//       }
//     );

//     console.log("Task Created ID:", response.data.result);
//     return response.data.result;

//   } catch (error) {
//     console.error("Task Creation Error:", error.response?.data || error.message);
//     throw error;
//   }
// }

// /**
//  * Main function: creates project (or reuses existing) and adds a task.
//  */
// async function createOdooProjectAndTask({ customerName , auth}) {
// let createdValue = await createProject(auth)
// console.log(createdValue , "this is value");

// //   const project = await findOrCreateProject(projectName);

// //   const taskName = `[${rfqType}] ${category} — ${new Date().toLocaleDateString("en-GB")}`;
// //   const description = `
// //     <p><strong>RFQ Details</strong></p>
// //     <ul>
// //       <li>Client: ${customerName}</li>
// //       <li>Type: ${rfqType}</li>
// //       <li>Category: ${category}</li>
// //       <li>Submitted: ${new Date().toLocaleString()}</li>
// //       <li>Files: <a href="${driveFileUrl}">${driveFileUrl}</a></li>
// //     </ul>
// //   `;

//   const taskId = await createTask({ SESSION_ID: auth , projectId: createdValue });
// }


// async function createProject(SESSION_ID) {
//     console.log(`session_id=${SESSION_ID}`);
    
//   try {
//     const response = await axios.post(
//       `https://flair-labs.odoo.com/web/dataset/call_kw`,
//       {
//         jsonrpc: "2.0",
//         method: "call",
//         params: {
//           model: "project.project",
//           method: "create",
//           args: [
//             {
//               name: "RFQ Automation Project - RFQ-TEST",
//             },
//           ],
//           kwargs: {},
//         },
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Cookie: `session_id=${SESSION_ID}`,
//         },
//       }
//     );

//     console.log("Project Created ID:", response.data.result);
//     return response.data.result;
//   } catch (error) {
//     console.error("Error:", error.response?.data || error.message);
//   }
// }
// module.exports = { createOdooProjectAndTask , getSessionId  };