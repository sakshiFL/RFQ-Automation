const express = require("express");
const router = express.Router();
const { createTask, createPurchaseOrder, attachFileToTask, getAttachmentById } = require("../services/odoo");
const { cancelTask, getTaskById } = require("../services/odoo");

/**
 * Process webhook data and create task
 * @param {Object} webhookData - Data received from Odoo webhook
 * @returns {Object} Result of task creation or null
 */
async function processApprovedWebhook(webhookData) {
  try {
    console.log(`📊 Processing webhook data`);

    // Extract project_id from webhook
    const projectId = webhookData.project_id || webhookData.data?.project_id;

    // Validate required fields
    if (!projectId) {
      console.warn("⚠️ No project_id found in webhook data");
      return { 
        success: false, 
        error: "Missing project_id" 
      };
    }

    console.log(`✅ Creating new task in Odoo for project_id: ${projectId}`);

    // Extract node name from webhook
    const currentNodeName = webhookData.x_studio_node_name || webhookData.data?.x_studio_node_name;
    const partnerId = webhookData.partner_id || webhookData.data?.partner_id || 5;
    const inputType = webhookData.x_studio_input_type || webhookData.data?.x_studio_input_type || "2D & 3D type";
    
    console.log(`Current node name: ${currentNodeName}`);

    // Check if node is "RFQ Quotation Generation" - create purchase order
    if (currentNodeName === "RFQ Quotation Generation") {
      console.log("🛒 Creating Purchase Order for RFQ Quotation Generation");
      
      const purchaseOrderResult = await createPurchaseOrder(partnerId, inputType);
      
      console.log("🎉 Purchase Order created successfully:", purchaseOrderResult);
      
      return {
        success: true,
        purchaseOrder: purchaseOrderResult,
        project_id: projectId,
        triggered_by: "rfq_quotation_generation"
      };
    }

    // Otherwise, create task based on current node
    let taskName;
    let nextNodeName;

    if (currentNodeName === "Data Extraction") {
      taskName = "Review Cost Estimate";
      nextNodeName = "Costing Calculation";
    } else if (currentNodeName === "Costing Calculation") {
      taskName = "Review Client Quotation";
      nextNodeName = "RFQ Quotation Generation";
    } else {
      taskName = "New Task";
      nextNodeName = currentNodeName || "General";
    }

    const description = webhookData.description || webhookData.data?.description || "Task created from webhook";

    console.log(`📝 Creating task: "${taskName}" with node: "${nextNodeName}"`);

    // Create task in Odoo
    const taskResult = await createTask(taskName, projectId, description, nextNodeName);
    
    console.log("🎉 Task created successfully:", taskResult);
    
    return {
      success: true,
      task: taskResult,
      project_id: projectId,
      triggered_by: "webhook"
    };
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function processChangeRequestedWebhook(webhookData) {
  try {
    console.log("🔄 Processing Change Requested Webhook");

    const data = webhookData.data || webhookData;

    const taskId = data.id;
    const taskName = data.display_name;
    const description = data.description || "Task created from webhook";
    const attachmentIds = data.attachment_ids || [];
    const currentNodeName = data.x_studio_node_name;
    const projectId = data.project_id;

    if (!taskId) {
      return { success: false, error: "Missing task_id" };
    }

    // 📎 STEP 1: Fetch all attachments BEFORE cancelling
    let attachments = [];

    if (attachmentIds.length > 0) {
      console.log(`📥 Fetching ${attachmentIds.length} attachments`);

      for (const attId of attachmentIds) {
        const attachment = await getAttachmentById(taskId, attId);
        attachments.push(attachment);
      }
    }

    // ❌ STEP 2: Cancel old task
    console.log(`❌ Cancelling old task: ${taskId}`);
    await cancelTask(taskId);

    // 📝 STEP 3: Create revised task
    const newTaskName = `${taskName} - Revised`;

    const taskResult = await createTask(
      newTaskName,
      projectId,
      description,
      currentNodeName
    );

    console.log("🎉 Task created successfully:", taskResult);

    // 📎 STEP 4: Re-attach files to new task
    if (attachments.length > 0) {
      console.log(`📤 Re-attaching ${attachments.length} files`);

      for (const file of attachments) {
        await attachFileToTask(taskResult.taskId, file);
      }
    }

    return {
      success: true,
      task: taskResult,
      project_id: projectId,
      triggered_by: "change_requested"
    };

  } catch (error) {
    console.error("❌ Error in Change Requested:", error);
    return { success: false, error: error.message };
  }
}

// async function processChangeRequestedWebhook(webhookData) {
//   try {
//     console.log("🔄 Processing Change Requested Webhook");

//     const taskId = webhookData.id || webhookData.data?.id;

//     if (!taskId) {
//       return { success: false, error: "Missing task_id" };
//     }
//     const taskName = webhookData.display_name || webhookData.data?.display_name;
//     const description = webhookData.description || webhookData.data?.description || "Task created from webhook";
//     const attachmentIds = webhookData.attachment_ids || webhookData.data?.attachment_ids || [];
//     const attachmentId = attachmentIds[0];
//     const currentNodeName = webhookData.x_studio_node_name || webhookData.data?.x_studio_node_name;
//     const projectId = webhookData.project_id || webhookData.data?.project_id;
    
//     console.log(`❌ Cancelling old task: ${taskId}`);
//     await cancelTask(taskId);  

//     const newTaskName = `${taskName} - Revised_1`;

//     // Create task in Odoo
//     const taskResult = await createTask(newTaskName, projectId, description, currentNodeName);
    
//     console.log("🎉 Task created successfully:", taskResult);

//     return {
//       success: true,
//       task: taskResult,
//       project_id: projectId,
//       triggered_by: "webhook"
//     };

//   } catch (error) {
//     console.error("❌ Error in Change Requested:", error);
//     return { success: false, error: error.message };
//   }
// }

/**
 * Odoo Webhook Endpoint
 * Receives webhook data from Odoo and logs it
 */
router.post("/odoo", express.json(), async (req, res) => {
  try {
    console.log("========================================");
    console.log("📥 Odoo Webhook Received");
    console.log("========================================");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("========================================");

    // Process the webhook data and create task if approved
    const processResult = await processApprovedWebhook(req.body);

    // Always respond quickly to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: "Webhook received successfully",
      received_at: new Date().toISOString(),
      processing: processResult
    });

  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error processing webhook" 
    });
  }
});

router.post("/odoo/change-requested", express.json(), async (req, res) => {
  try {
    console.log("🔄 Change Requested Webhook Received");
    console.log("========================================");
    console.log("📥 Odoo Webhook Received");
    console.log("========================================");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("========================================");

    const result = await processChangeRequestedWebhook(req.body);

    res.status(200).json({
      success: true,
      message: "Change requested webhook processed",
      data: result
    });

  } catch (error) {
    console.error("❌ Error:", error);

    res.status(500).json({
      success: false,
      message: "Error processing change requested webhook"
    });
  }
});

/**
 * Generic Webhook Endpoint (for testing)
 * Accepts any webhook and logs the data
 */
router.post("/test", express.json(), (req, res) => {
  console.log("🧪 Test Webhook:", {
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
    query: req.query
  });

  res.json({ received: true });
});

module.exports = router;
