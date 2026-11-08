package expo.modules.receiptocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReceiptOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReceiptOcr")

    // Returns each line with its box, so JS can put columns back into rows ("Net Payable" ... "2,205.00").
    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val image = InputImage.fromFilePath(context, Uri.parse(uri))
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      recognizer.process(image)
        .addOnSuccessListener { result ->
          val lines = result.textBlocks.flatMap { it.lines }.map { line ->
            val box = line.boundingBox
            mapOf(
              "text" to line.text,
              "left" to (box?.left ?: 0),
              "top" to (box?.top ?: 0),
              "right" to (box?.right ?: 0),
              "bottom" to (box?.bottom ?: 0)
            )
          }
          recognizer.close()
          promise.resolve(lines)
        }
        .addOnFailureListener { error ->
          recognizer.close()
          promise.reject("ERR_RECEIPT_OCR", error.message ?: "Text recognition failed", error)
        }
    }
  }
}
