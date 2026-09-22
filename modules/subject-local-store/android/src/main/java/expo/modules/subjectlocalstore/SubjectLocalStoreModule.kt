package expo.modules.subjectlocalstore

import androidx.room.Room
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.Executors

class SubjectLocalStoreModule : Module() {
  private val executor = Executors.newSingleThreadExecutor()
  private var database: LocalDatabase? = null

  // Called only on this module's serial worker. No network or main-thread I/O.
  private fun db(): LocalDatabase {
    return database ?: Room.databaseBuilder(
      requireNotNull(appContext.reactContext).applicationContext,
      LocalDatabase::class.java,
      "subject-japan-local.db"
    ).build().also { database = it }
  }

  override fun definition() = ModuleDefinition {
    Name("SubjectLocalStore")
    AsyncFunction("read") { promise: Promise ->
      executor.execute {
        try { promise.resolve(db().documents().read("state")?.payload) }
        catch (e: Exception) { promise.reject("LOCAL_READ", "기기 저장소를 읽지 못했어요.", e) }
      }
    }
    AsyncFunction("write") { payload: String, promise: Promise ->
      executor.execute {
        try {
          db().documents().write(LocalDocument("state", payload, System.currentTimeMillis()))
          promise.resolve(null)
        } catch (e: Exception) { promise.reject("LOCAL_WRITE", "기기 저장소에 저장하지 못했어요.", e) }
      }
    }
    OnDestroy {
      executor.execute { database?.close(); database = null }
      executor.shutdown()
    }
  }
}
