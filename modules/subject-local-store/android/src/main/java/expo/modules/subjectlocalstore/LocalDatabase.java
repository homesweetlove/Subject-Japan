package expo.modules.subjectlocalstore;

import androidx.room.Database;
import androidx.room.RoomDatabase;

@Database(entities = {LocalDocument.class}, version = 1, exportSchema = false)
public abstract class LocalDatabase extends RoomDatabase {
  public abstract LocalDocumentDao documents();
}
