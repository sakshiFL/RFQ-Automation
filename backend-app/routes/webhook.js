const express = require("express");
const router = express.Router();
const { createTask, createPurchaseOrder } = require("../services/odoo");

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

    // Extract node name and approval status from webhook
    const currentNodeName = webhookData.x_studio_node_name || webhookData.data?.x_studio_node_name;
    const isApproved = webhookData.approved || webhookData.is_approved || webhookData.data?.approved;
    const partnerId = webhookData.partner_id || webhookData.data?.partner_id || 5;
    const inputType = webhookData.x_studio_input_type || webhookData.data?.x_studio_input_type || "2D & 3D type";
    
    console.log(`Current node name: ${currentNodeName}`);
    console.log(`Approval status: ${isApproved}`);

    // Check if we should create a purchase order
    if (currentNodeName === "RFQ Quotation Generation" && isApproved) {
      console.log("🛒 Creating Purchase Order (Approved RFQ Quotation)");
      
      const purchaseOrderResult = await createPurchaseOrder(partnerId, inputType);
      
      console.log("🎉 Purchase Order created successfully:", purchaseOrderResult);
      
      return {
        success: true,
        purchaseOrder: purchaseOrderResult,
        project_id: projectId,
        triggered_by: "approved_quotation"
      };
    }

    // Otherwise, create task based on current node
    let taskName;
    let nextNodeName;

    if (currentNodeName === "Data Extraction") {
      taskName = "Review Cost Estimate";
      nextNodeName = "Costing";
    } else if (currentNodeName === "Costing") {
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
