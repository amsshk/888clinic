// Middleware to serve before-after assets that were previously on Lovable's CDN
// Maps old Lovable paths to local assets

const ASSET_MAP: Record<string, string> = {
  "10078c34-03fe-47bd-b402-f5455cd4d52d/ba-07398f9c-DxADmaDZ.jpg": "ba-07398f9c-DxADmaDZ.jpg",
  "10d0dd40-86e2-4f06-9089-8ef8302ce442/ba-07e73527-ThmdJyUC.jpg": "ba-07e73527-ThmdJyUC.jpg",
  "cab6806c-58ee-45fb-a975-a4423d168001/ba-080b016c-B4vQM79o.jpg": "ba-080b016c-B4vQM79o.jpg",
  "f89590ba-f4be-45b3-a98b-b77393ba9c47/ba-8e89da87-E2Jmz6hH.jpg": "ba-8e89da87-E2Jmz6hH.jpg",
  "679f27da-7069-4e96-8d76-47eda5f2529d/ba-99fd5bda-Bp26B8tP.jpg": "ba-99fd5bda-Bp26B8tP.jpg",
  "3924c53b-3ec2-4652-8ab1-59d611ec1e85/ba-f0959737-BVOACBfI.jpg": "ba-f0959737-BVOACBfI.jpg",
  "150eb537-021d-4f30-b8e2-667894120a6c/ba-f2b7571d-G3fyVY34.jpg": "ba-f2b7571d-G3fyVY34.jpg",
  "c3994f08-1439-4277-9407-3936175ebfbe/ba-156d40d8-DZQh3PQt.jpg": "ba-156d40d8-DZQh3PQt.jpg",
  "71efb6dc-8851-421d-a7ac-e7e604803631/ba-595b26f7-DwRw3_7i.jpg": "ba-595b26f7-DwRw3_7i.jpg",
  "1f5f98a9-d4d5-41c1-a35a-3c235ef7b41d/ba-654e8303-CAF_T_Yj.jpg": "ba-654e8303-CAF_T_Yj.jpg",
  "3aa9d0ae-4544-4f5b-a2eb-d29fc339b32f/ba-89d45b9d-B0GBT1Wc.jpg": "ba-89d45b9d-B0GBT1Wc.jpg",
  "9d4d8de5-8434-42ac-94b4-344f3b0f88fa/ba-8aa8f9a5-BL26o9cn.jpg": "ba-8aa8f9a5-BL26o9cn.jpg",
  "36b9867a-87f9-4433-886f-0405c44b7cc5/ba-9b9be917-COdQl9Oq.jpg": "ba-9b9be917-COdQl9Oq.jpg",
  "ff9befd1-5c5e-4ead-a579-66d6fb614f24/ba-acc31a12-BupIunsW.jpg": "ba-acc31a12-BupIunsW.jpg",
  "6433e787-737d-4f8f-93c2-e4e47c940098/ba-cec51db3-D6Y3TuHt.jpg": "ba-cec51db3-D6Y3TuHt.jpg",
  "bc8232c0-6eb3-46f4-b765-5aecdb052863/ba-cecc847e-D_PnGZcR.jpg": "ba-cecc847e-D_PnGZcR.jpg",
  "78f9cb9e-068a-46d3-8986-1fcda3925f41/ba-4bfcd593-DeJvTZzn.jpg": "ba-4bfcd593-DeJvTZzn.jpg",
  "c5dba654-c859-4336-b405-b3fe14c0a071/ba-066f5d0b-COgIvpq7.jpg": "ba-066f5d0b-COgIvpq7.jpg",
  "f8290577-f98f-448f-8c96-7723e2d1eb00/ba-a2158e30-vPrT7mIO.jpg": "ba-a2158e30-vPrT7mIO.jpg",
  "38327453-2f29-449b-a781-5588c04bcb25/ba-e6db236f-CGiUUekw.jpg": "ba-e6db236f-CGiUUekw.jpg",
  "d8377500-b71f-4ea6-831c-e810dbe714b2/ba-4c85406d-CLDt6Vv2.jpg": "ba-4c85406d-CLDt6Vv2.jpg",
  "c089f8ec-c2bc-42d3-a9b4-2f84c88a9805/ba-d25e720d-DU587fZr.jpg": "ba-d25e720d-DU587fZr.jpg",
  "1d7eb636-b875-4f49-9a8a-91d2525e277a/ba-ba8774c6-wsN-ybVz.jpg": "ba-ba8774c6-wsN-ybVz.jpg",
  "0f7d9174-dc30-4227-b595-ae7c49c92b9b/ba-c254e8c4-CfzxYWw9.jpg": "ba-c254e8c4-CfzxYWw9.jpg",
  "4cc89a16-24fa-45ee-a07f-f9256632cbdc/ba-e7059ba3-CBC4ImlF.jpg": "ba-e7059ba3-CBC4ImlF.jpg",
  "06c46da1-6536-465e-9d28-922003ab7f0e/ba-3f0f0b94-B6G_QjFL.jpg": "ba-3f0f0b94-B6G_QjFL.jpg",
  "79149e71-4c95-4534-8f10-057a08b04c25/ba-9a2dae7f-CesPSK70.jpg": "ba-9a2dae7f-CesPSK70.jpg",
  "0ec7d5de-6c8b-4a35-be85-dc4c9e7832ab/ba-6f4b2b98-DvU3wfN3.jpg": "ba-6f4b2b98-DvU3wfN3.jpg",
  "777739c8-6a75-476e-8f74-1e65080aa0de/ba-c919e46c-HcpF50W1.jpg": "ba-c919e46c-HcpF50W1.jpg",
  "c7b6620b-dc71-455e-8d0e-d3f357098ad7/ba-5e1e9ca4-Cb16auGZ.jpg": "ba-5e1e9ca4-Cb16auGZ.jpg",
  "386093f8-24de-4a9a-bc13-7270377cedb8/ba-d076805a-Bcexhu9w.jpg": "ba-d076805a-Bcexhu9w.jpg",
};

export default defineEventHandler(async (event) => {
  const url = getHeader(event, "url") || event.node.req.url || "";

  // Match Lovable CDN pattern: /__l5e/assets-v1/UUID/FILENAME
  const match = url.match(/^\/__l5e\/assets-v1\/([^/]+\/[^/]+)$/);
  if (!match) {
    return; // Not a lovable asset, continue to next handler
  }

  const assetKey = match[1];
  const localFilename = ASSET_MAP[assetKey];

  if (!localFilename) {
    setResponseStatus(event, 404);
    return "Asset not found";
  }

  // Serve from .output/public/assets
  // The actual file serving is handled by Nitro's static asset middleware
  // We just rewrite the path
  event.node.req.url = `/assets/${localFilename}`;
});

