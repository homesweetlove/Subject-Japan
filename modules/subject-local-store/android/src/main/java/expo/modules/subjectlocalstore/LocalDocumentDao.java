package expo.modules.subjectlocalstore;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

@Dao
public interface LocalDocumentDao {
  @Query("SELECT * FROM local_documents WHERE id = :id LIMIT 1")
  LocalDocument read(String id);

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  void write(LocalDocument document);
}
