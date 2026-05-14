import { runComprehensiveWeeklyScan } from "./server/services/weekly-scan-service";

async function testEmailScan() {
  console.log("Starting comprehensive weekly scan to test email delivery...");
  console.log("Target recipients: bradley.cooper@1qg.com, grant.vanwyk@1qg.com");
  
  try {
    const result = await runComprehensiveWeeklyScan();
    console.log("\n=== SCAN RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log("\n✅ Scan completed successfully!");
      console.log("📧 Email notification should have been sent to admins.");
    } else {
      console.log("\n⚠️ Scan completed with issues:");
      console.log("Status:", result.status);
    }
  } catch (error) {
    console.error("\n❌ Scan failed with error:", error);
  }
  
  process.exit(0);
}

testEmailScan();
