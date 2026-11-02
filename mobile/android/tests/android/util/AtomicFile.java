package android.util;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
/** JVM test double approximating legacy .bak and current .new AtomicFile modes. */
public class AtomicFile {
    public static boolean LEGACY = false;
    private final File base, backup, temp;
    public AtomicFile(File base) { this.base=base; backup=new File(base.getPath()+".bak"); temp=new File(base.getPath()+".new"); }
    public File getBaseFile() { return base; }
    private static void move(File a, File b) throws IOException { Files.move(a.toPath(),b.toPath(),StandardCopyOption.REPLACE_EXISTING); }
    public FileInputStream openRead() throws IOException {
        if (backup.exists()) move(backup,base);
        if (temp.exists() && base.exists()) temp.delete();
        return new FileInputStream(base);
    }
    public FileOutputStream startWrite() throws IOException {
        if (LEGACY) {
            if (base.exists()) { if (!backup.exists()) move(base,backup); else base.delete(); }
            return new FileOutputStream(base);
        }
        if (backup.exists()) move(backup,base);
        return new FileOutputStream(temp);
    }
    public void finishWrite(FileOutputStream stream) throws IOException {
        stream.getFD().sync(); stream.close();
        if (LEGACY) backup.delete(); else move(temp,base);
    }
    public void failWrite(FileOutputStream stream) throws IOException {
        stream.close();
        if (LEGACY) { base.delete(); if (backup.exists()) move(backup,base); } else temp.delete();
    }
    public void delete() { base.delete(); backup.delete(); temp.delete(); }
}
