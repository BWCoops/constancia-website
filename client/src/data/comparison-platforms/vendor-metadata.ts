import sapLogoPath from "@assets/SAP_1772467905660.png";
import ibmLogoPath from "@assets/IBM_logo.png";

export interface VendorMeta {
  website: string;
  logoDomain: string;
  logoOverride?: string;
}

export const vendorMetadata: Record<string, VendorMeta> = {
  "onestream": {
    website: "https://www.onestream.com",
    logoDomain: "onestream.com",
  },
  "abacum": {
    website: "https://www.abacum.io",
    logoDomain: "abacum.io",
  },
  "onestream-cpm-express": {
    website: "https://www.onestream.com/cpm-express",
    logoDomain: "onestream.com",
  },
  "pigment": {
    website: "https://www.pigment.com",
    logoDomain: "pigment.com",
  },
  "oracle-epm": {
    website: "https://www.oracle.com/performance-management",
    logoDomain: "oracle.com",
  },
  "oracle": {
    website: "https://www.oracle.com/performance-management",
    logoDomain: "oracle.com",
  },
  "anaplan": {
    website: "https://www.anaplan.com",
    logoDomain: "anaplan.com",
  },
  "board": {
    website: "https://www.board.com",
    logoDomain: "board.com",
  },
  "sap-bpc": {
    website: "https://www.sap.com/products/financial-management/business-planning-consolidation.html",
    logoDomain: "sap.com",
    logoOverride: sapLogoPath,
  },
  "sapbpc": {
    website: "https://www.sap.com/products/financial-management/business-planning-consolidation.html",
    logoDomain: "sap.com",
    logoOverride: sapLogoPath,
  },
  "sap-sac": {
    website: "https://www.sap.com/products/technology-platform/cloud-analytics.html",
    logoDomain: "sap.com",
    logoOverride: sapLogoPath,
  },
  "sap-sac-gr": {
    website: "https://www.sap.com/products/technology-platform/cloud-analytics.html",
    logoDomain: "sap.com",
    logoOverride: sapLogoPath,
  },
  "cch-tagetik": {
    website: "https://www.wolterskluwer.com/en/solutions/cch-tagetik",
    logoDomain: "wolterskluwer.com",
  },
  "jedox": {
    website: "https://www.jedox.com",
    logoDomain: "jedox.com",
  },
  "ibm-tm1": {
    website: "https://www.ibm.com/products/planning-analytics",
    logoDomain: "ibm.com",
    logoOverride: ibmLogoPath,
  },
  "ibm-planning-analytics": {
    website: "https://www.ibm.com/products/planning-analytics",
    logoDomain: "ibm.com",
    logoOverride: ibmLogoPath,
  },
  "vena": {
    website: "https://www.venasolutions.com",
    logoDomain: "venasolutions.com",
  },
  "workday-adaptive": {
    website: "https://www.workday.com/en-gb/products/adaptive-planning.html",
    logoDomain: "workday.com",
  },
  "planful": {
    website: "https://www.planful.com",
    logoDomain: "planful.com",
  },
  "prophix": {
    website: "https://www.prophix.com",
    logoDomain: "prophix.com",
  },
  "oracle-erp": {
    website: "https://www.oracle.com/erp",
    logoDomain: "oracle.com",
  },
  "sap-s4hana": {
    website: "https://www.sap.com/products/erp/s4hana.html",
    logoDomain: "sap.com",
    logoOverride: sapLogoPath,
  },
  "dynamics-365": {
    website: "https://www.microsoft.com/en-gb/dynamics-365",
    logoDomain: "microsoft.com",
  },
  "dynamics365": {
    website: "https://www.microsoft.com/en-gb/dynamics-365",
    logoDomain: "microsoft.com",
  },
  "workday": {
    website: "https://www.workday.com/en-gb/products/financial-management.html",
    logoDomain: "workday.com",
  },
  "workday-fin": {
    website: "https://www.workday.com/en-gb/products/financial-management.html",
    logoDomain: "workday.com",
  },
  "netsuite": {
    website: "https://www.netsuite.com",
    logoDomain: "netsuite.com",
  },
  "sage-intacct": {
    website: "https://www.sage.com/en-gb/sage-intacct",
    logoDomain: "sage.com",
  },
  "infor-cloudsuite": {
    website: "https://www.infor.com/products/cloudsuite-financials",
    logoDomain: "infor.com",
  },
  "ifs-cloud": {
    website: "https://www.ifs.com/ifs-cloud",
    logoDomain: "ifs.com",
  },
  "epicor-kinetic": {
    website: "https://www.epicor.com/en-uk/erp-systems/kinetic",
    logoDomain: "epicor.com",
  },
  "acumatica": {
    website: "https://www.acumatica.com",
    logoDomain: "acumatica.com",
  },
  "xero": {
    website: "https://www.xero.com",
    logoDomain: "xero.com",
  },
  "quickbooks": {
    website: "https://quickbooks.intuit.com",
    logoDomain: "intuit.com",
  },
  "zoho-books": {
    website: "https://www.zoho.com/books",
    logoDomain: "zoho.com",
  },
  "zoho": {
    website: "https://www.zoho.com/books",
    logoDomain: "zoho.com",
  },
  "freshbooks": {
    website: "https://www.freshbooks.com",
    logoDomain: "freshbooks.com",
  },
  "copilot-finance": {
    website: "https://www.microsoft.com/en-gb/microsoft-copilot",
    logoDomain: "microsoft.com",
  },
  "chatgpt-enterprise": {
    website: "https://openai.com/chatgpt/enterprise",
    logoDomain: "openai.com",
  },
  "gemini-workspace": {
    website: "https://workspace.google.com/solutions/ai",
    logoDomain: "google.com",
  },
  "claude-enterprise": {
    website: "https://www.anthropic.com/claude",
    logoDomain: "anthropic.com",
  },
  "watsonx": {
    website: "https://www.ibm.com/watsonx",
    logoDomain: "ibm.com",
    logoOverride: ibmLogoPath,
  },
  "automation-anywhere": {
    website: "https://www.automationanywhere.com",
    logoDomain: "automationanywhere.com",
  },
  "uipath-ai": {
    website: "https://www.uipath.com",
    logoDomain: "uipath.com",
  },
  "cohere-enterprise": {
    website: "https://cohere.com",
    logoDomain: "cohere.com",
  },
  "aws-bedrock": {
    website: "https://aws.amazon.com/bedrock",
    logoDomain: "amazon.com",
  },
  "salesforce-einstein": {
    website: "https://www.salesforce.com/einstein",
    logoDomain: "salesforce.com",
  },
  "mistral-ai": {
    website: "https://mistral.ai",
    logoDomain: "mistral.ai",
  },
  "meta-llama": {
    website: "https://llama.meta.com",
    logoDomain: "meta.com",
  },
  "deepseek-r1": {
    website: "https://www.deepseek.com",
    logoDomain: "deepseek.com",
  },
  "aleph-alpha": {
    website: "https://www.aleph-alpha.com",
    logoDomain: "aleph-alpha.com",
  },
  "xai-grok": {
    website: "https://x.ai",
    logoDomain: "x.ai",
  },
  "langchain": {
    website: "https://www.langchain.com",
    logoDomain: "langchain.com",
  },
  "autogen": {
    website: "https://microsoft.github.io/autogen",
    logoDomain: "microsoft.com",
  },
  "crewai": {
    website: "https://www.crewai.com",
    logoDomain: "crewai.com",
  },
  "nvidia-nim": {
    website: "https://www.nvidia.com/en-gb/ai",
    logoDomain: "nvidia.com",
  },
  "runway": {
    website: "https://www.runway.com",
    logoDomain: "runway.com",
  },
  "datarails": {
    website: "https://www.datarails.com",
    logoDomain: "datarails.com",
  },
  "cube": {
    website: "https://www.cubesoftware.com",
    logoDomain: "cubesoftware.com",
  },
  "mosaic": {
    website: "https://www.mosaic.tech",
    logoDomain: "mosaic.tech",
  },
  "drivetrain": {
    website: "https://www.drivetrain.ai",
    logoDomain: "drivetrain.ai",
  },
  "liveflow": {
    website: "https://www.liveflow.io",
    logoDomain: "liveflow.io",
  },
  "vareto": {
    website: "https://www.vareto.com",
    logoDomain: "vareto.com",
  },
  "campfire": {
    website: "https://www.campfire.com",
    logoDomain: "campfire.com",
  },
};
