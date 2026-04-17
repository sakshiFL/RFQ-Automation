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
  try {
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
    return response.data.result;
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
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
// 
  // Insert into the model used for dashboard visualization
  await odooCall("x_task_dashboard", "create", [
    {
      x_projectId: projectId,
      x_name: projectName,
      x_status: "RFQ Creation"
    }
  ])

  return {
    projectId,
    projectName,
  };
}

async function createTask(TaskName, projectId , description , NodeName ) {
  const Task = `${TaskName}`;

  const taskId = await odooCall("project.task", "create", [
    {
      name: Task,
      project_id: projectId,
      description,
      x_studio_node_name: NodeName,
    },
  ]);

  //For each task creation update the status of project to that task
  const projectStatusId = await odooCall("x_task_dashboard", "search", [
    [["x_projectId", "=", projectId]]
  ])
console.log(NodeName , "CHANGE THIS NODE NAME -:::::: ---------- ");

  await odooCall("x_task_dashboard", "write", [
    projectStatusId,
    { x_status: NodeName }
  ])

  return {
    taskId,
    taskName : TaskName
  };
}

async function cancelTask(taskId) {
  // const CANCEL_STAGE_ID = process.env.CANCEL_STAGE_ID; // keep it configurable

  // if (!CANCEL_STAGE_ID) {
  //   throw new Error("CANCEL_STAGE_ID is not defined in env");
  // }

  if (!taskId) {
    throw new Error("taskId is required to cancel task");
  }

  const vals = {
    state: "1_canceled" // your custom state
  };

   console.log("❌ Cancelling task:", taskId, "with vals:", vals);

  await odooCall("project.task", "write", [
    [taskId],
    vals
  ]);

  return {
    taskId,
    status: "cancelled"
  };

}

async function getAttachmentById(taskId, attachmentId) {
  const result = await odooCall("ir.attachment", "search_read", [
    [
      ["res_model", "=", "project.task"],
      ["res_id", "=", taskId],
      ["id", "=", attachmentId]
    ]
  ], {
    fields: ["id", "name", "datas", "mimetype"]
  });

  if (!result.length) {
    throw new Error("Attachment not found");
  }

  return result[0]; // { id, name, datas, mimetype }
}

async function getTaskDescription(taskName) {
  switch (taskName) {
    case "Review Extracted Data":
      return `Please review the extracted data and verify its accuracy.\nSheet: https://docs.google.com/spreadsheets/d/1I14OyWPDSL-DR-QkWW2OWpIxyrPQHHh7/edit?usp=sharing&ouid=108065393827917820463&rtpof=true&sd=true`;

    case "Review Cost Estimate":
      return `Please review the cost estimation and validate pricing.\nSheet: https://docs.google.com/spreadsheets/d/1TMiFCp4cHDd913Yh15b_XC6rgCCIIQoV/edit?usp=sharing&ouid=108065393827917820463&rtpof=true&sd=true`;

    case "Review Client Quotation":
      return `Please review the client quotation before final submission and approval.\nSheet: https://docs.google.com/spreadsheets/d/1bhWSQ80BleHUb9vwekljKF-QT7BrNuw2/edit?usp=sharing&ouid=108065393827917820463&rtpof=true&sd=true`;

    default:
      return `Please review the task details.\nReference: https://drive.google.com/drive/folders/1LMdPPmoSc9v16tfoKw9vIHaNSuha1cz1?usp=drive_link`;
  }
}

async function attachFileToTask(taskId, attachment) {
  if (!taskId || !attachment?.datas) {
    throw new Error("Invalid attachment data");
  }

  const attachmentId = await odooCall("ir.attachment", "create", [
    {
      name: attachment.name,
      type: "binary",
      datas: attachment.datas,
      mimetype: attachment.mimetype,
      res_model: "project.task",
      res_id: taskId
    }
  ]);

  return {
    newAttachmentId: attachmentId,
    fileName: attachment.name
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
 
/**
 * ✅ CREATE PURCHASE ORDER
 */
async function createPurchaseOrder(partnerId, inputType) {
  const purchaseOrderId = await odooCall("purchase.order", "create", [
    {
      partner_id: partnerId,
      x_studio_input_type: inputType,
    },
  ]);

  return {
    purchaseOrderId,
    partnerId,
    inputType,
  };
}

async function markProjectAsComplete(projectId) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  console.log("🏁 Marking project as complete:", projectId);

  await odooCall("project.project", "write", [
    [projectId], // ✅ must be array
    {
      last_update_status: "done"
    }
  ]);

  return {
    projectId,
    status: "completed"
  };
}

module.exports = {
  createProject, createProjectDummy, createTask, createPurchaseOrder, cancelTask, attachFileToTask,
  getAttachmentById, getTaskDescription, markProjectAsComplete
};

 