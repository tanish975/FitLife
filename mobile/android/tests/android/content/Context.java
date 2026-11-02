package android.content;
import java.io.File;
/** JVM test double. */
public class Context {
    private final File dir;
    public Context(File dir) { this.dir = dir; }
    public File getNoBackupFilesDir() { return dir; }
}
