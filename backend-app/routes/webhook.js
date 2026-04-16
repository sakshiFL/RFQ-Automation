const express = require("express");
const router = express.Router();
const { createTask, createPurchaseOrder, cancelTask, getTaskById, odooCall } = require("../services/odoo");
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
    const state = webhookData.state || webhookData.data?.state || "03_approved";
    console.log(`Current node name: ${currentNodeName}`);
console.log(`Current state: ${state}`);
console.log(webhookData.state , "-----------------STATE------------------");

    // Check if node is "RFQ Quotation Generation" - create purchase order
    if (currentNodeName === "RFQ Quotation Generation") {
      const purchaseOrderResult = await createPurchaseOrder(partnerId, inputType);
      console.log("this is 39");
      
      if(state == "03_approved"){
        console.log("Updating status to 'Quotation Generated'");

        // Extract description/link from webhook
        const description = webhookData.description || webhookData.data?.description || "";
        
        // Extract URL from description if it contains one
        const urlMatch = description.match(/(https?:\/\/[^\s]+)/);
        const extractedLink = urlMatch ? urlMatch[0] : description;

        // First, search for the dashboard record with this projectId
        const dashboardRecordIds = await odooCall("x_task_dashboard", "search", [
          [["x_projectId", "=", projectId]]
        ]);

        console.log("Dashboard Record IDs found:", dashboardRecordIds);
        console.log("Extracted link:", extractedLink);

        if (dashboardRecordIds && dashboardRecordIds.length > 0) {
          // Update the status and link
          await odooCall("x_task_dashboard", "write", [
            dashboardRecordIds,
            { 
              x_status: "Quotation Generated",
              x_link: extractedLink
            }
          ]);
          console.log("✅ Status updated to 'Quotation Generated' with link");
        } else {
          console.warn("⚠️ No dashboard record found for project_id:", projectId);
        }
      }
      // Update project status to "Quotation Generated"

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

    const taskId = webhookData.id || webhookData.data?.id;

    if (!taskId) {
      return { success: false, error: "Missing task_id" };
    }
    const taskName = webhookData.display_name || webhookData.data?.display_name;
    const description = webhookData.description || webhookData.data?.description || "Task created from webhook";

    const currentNodeName = webhookData.x_studio_node_name || webhookData.data?.x_studio_node_name;
    const projectId = webhookData.project_id || webhookData.data?.project_id;
    
    console.log(`❌ Cancelling old task: ${taskId}`);
    await cancelTask(taskId);  

    const newTaskName = `${taskName} - Revised_1`;

    // Create task in Odoo
    const taskResult = await createTask(newTaskName, projectId, description, currentNodeName);
    
    console.log("🎉 Task created successfully:", taskResult);

    return {
      success: true,
      task: taskResult,
      project_id: projectId,
      triggered_by: "webhook"
    };

  } catch (error) {
    console.error("❌ Error in Change Requested:", error);
    return { success: false, error: error.message };
  }
}

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
