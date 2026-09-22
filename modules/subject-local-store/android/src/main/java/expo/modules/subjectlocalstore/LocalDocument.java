package expo.modules.subjectlocalstore;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

/** One atomic document keeps countdowns and all user data consistent on reset. */
@Entity(tableName = "local_documents")
public class LocalDocument {
  @PrimaryKey @NonNull public String id;
  @NonNull public String payload;
  public long updatedAt;

  public LocalDocument(@NonNull String id, @NonNull String payload, long updatedAt) {
    this.id = id;
    this.payload = payload;
    this.updatedAt = updatedAt;
  }
}
