import { FLP } from 'dawparse';

self.onmessage = (event) => {
  try {
    const { buffer, isZip, fileName } = event.data;
    
    // Parse the file synchronously in the background thread
    const flp = isZip ? new FLP({ zip: buffer }) : new FLP({ file: buffer });
    
    // Extract the properties needed for the UI since structured cloning 
    // will strip class methods when posting the message back to the main thread.
    const result = {
      bpm: flp.bpm,
      flpName: flp.flpName || fileName,
      project: {
        header: flp.project.header,
        events: flp.project.events,
      },
      files: flp.files || null,
    };
    
    // Send back the result object
    self.postMessage({ success: true, flp: result });
  } catch (err) {
    self.postMessage({ success: false, error: err.message || String(err) });
  }
};
