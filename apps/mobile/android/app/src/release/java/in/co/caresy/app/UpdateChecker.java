package in.co.caresy.app;

import android.app.Activity;

/**
 * Release builds: no-op. Store builds update through Play, and the App
 * Distribution SDK is not permitted in Play production releases.
 */
final class UpdateChecker {
    static void check(Activity activity) {}

    private UpdateChecker() {}
}
