import { FLP } from 'dawparse';

self.onmessage = (event) => {
  try {
    const { buffer, isZip, fileName } = event.data;

    self.postMessage({ type: 'progress', message: isZip ? 'Decompressing ZIP package...' : 'Parsing FLP Project...' });

    // Defer the synchronous parsing so the progress message can be rendered by the UI
    setTimeout(() => {
      try {
        let lastPostTime = 0;
        const onProgress = (eventIndex, eventName, progressPct) => {
          const now = performance.now();
          // Update at most ~60 times per second to prevent flooding the main thread,
          // or always update if it's the final event (100%).
          if (now - lastPostTime > 16 || progressPct === 100) {
            console.debug(`event #${eventIndex} - ${progressPct}% | ${eventName}`);

            self.postMessage({
              type: 'progress',
              message: `Parsing FLP Project... Event #${eventIndex} (${eventName}) [${progressPct}%]`
            });
            lastPostTime = now;
          }
        };

        const flp = isZip ? new FLP({ zip: buffer, onProgress }) : new FLP({ file: buffer, onProgress });

        self.postMessage({ type: 'progress', message: 'Analyzing project events and building dashboard...' });

        const result = {
          bpm: flp.bpm,
          flpName: flp.flpName || fileName,
          project: {
            header: flp.project.header,
            events: flp.project.events,
          },
          files: flp.files || null,
        };

        const transferList = [];
        if (result.files) {
          for (const key in result.files) {
            if (result.files[key].buffer) {
              transferList.push(result.files[key].buffer);
            }
          }
        }

        // Add a slight delay before sending result so the final progress message flashes
        setTimeout(() => {
          self.postMessage({ success: true, flp: result }, transferList);
        }, 50);
      } catch (err) {
        self.postMessage({ success: false, error: err.message || String(err) });
      }
    }, 50);
  } catch (err) {
    self.postMessage({ success: false, error: err.message || String(err) });
  }
};
