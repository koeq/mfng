import {sanitize} from 'htmlescape';
import {nextMacroTask} from './next-macro-task.js';

const closingBodyHtmlText = `</body></html>`;

export function createInitialRscResponseTransformStream(
  rscStream: ReadableStream<Uint8Array>,
): ReadableWritablePair<Uint8Array, Uint8Array> {
  let removedClosingBodyHtmlText = false;
  let insertingRscStreamScripts: Promise<void> | undefined;
  let finishedInsertingRscStreamScripts = false;

  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = textDecoder.decode(chunk);

      if (
        text.endsWith(closingBodyHtmlText) &&
        !finishedInsertingRscStreamScripts
      ) {
        const [withoutClosingBodyHtmlText] = text.split(closingBodyHtmlText);

        controller.enqueue(textEncoder.encode(withoutClosingBodyHtmlText));

        removedClosingBodyHtmlText = true;
      } else {
        controller.enqueue(chunk);
      }

      if (!insertingRscStreamScripts) {
        const reader = rscStream.getReader();

        controller.enqueue(
          textEncoder.encode(
            `<script>(()=>{const{writable,readable}=new TransformStream();const writer=writable.getWriter();self.initialRscResponseStream=readable;self.addInitialRscResponseChunk=(text)=>writer.write(new TextEncoder().encode(text))})()</script>`,
          ),
        );

        insertingRscStreamScripts = new Promise(async (resolve) => {
          try {
            while (true) {
              const result = await reader.read();

              if (result.done) {
                finishedInsertingRscStreamScripts = true;

                if (removedClosingBodyHtmlText) {
                  controller.enqueue(textEncoder.encode(closingBodyHtmlText));
                }

                return resolve();
              }

              await nextMacroTask();

              controller.enqueue(
                textEncoder.encode(
                  `<script>self.addInitialRscResponseChunk(${sanitize(
                    JSON.stringify(textDecoder.decode(result.value)),
                  )});</script>`,
                ),
              );
            }
          } catch (error) {
            controller.error(error);
          }
        });
      }
    },

    flush() {
      return insertingRscStreamScripts;
    },
  });
}
