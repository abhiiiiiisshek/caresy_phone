package in.co.caresy.app;

import android.app.Activity;

import com.google.firebase.appdistribution.FirebaseAppDistribution;

/**
 * Debug builds: ask Firebase App Distribution whether a newer build exists and,
 * if so, run its built-in sign-in / download / install flow.
 *
 * The release source set has a no-op twin of this class, so the pre-release SDK
 * never reaches a production build.
 */
final class UpdateChecker {
    static void check(Activity activity) {
        FirebaseAppDistribution.getInstance()
                .updateIfNewReleaseAvailable()
                .addOnFailureListener(e -> {
                    // Not signed in, offline, or no new release. Never block the app.
                });
    }

    private UpdateChecker() {}
}
