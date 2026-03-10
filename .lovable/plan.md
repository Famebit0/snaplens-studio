

## Analysis

Based on my review of the code, network requests, and SDK documentation:

**What's working:**
- Staging API token is correctly selected for the dev/preview domain
- Lens group `686db339-3033-46be-83ce-e07891d5a87e` loads successfully (200 OK) with 3 lenses: "Simple Typing Test", "CamKit Cutout", "CamKit High Score"
- Camera Kit WASM and core assets load correctly
- No console errors detected

**What needs fixing:**

The code mostly follows the SDK best practices, but there are a few issues that could cause a black viewport or rendering problems:

1. **`cameraType` passed incorrectly**: The SDK docs show `cameraType` accepts `'user'` or `'environment'` (matching facingMode), but the code passes `'front'` / `'back'`. The official docs use `cameraType: facingMode` directly, while camera-switching example uses `'front'` / `'back'`. Need to align with the SDK's expected values.

2. **`sess.play()` should be called without arguments**: The previous fix may have introduced `sess.play("live")` which is not in the SDK docs. The examples all just call `session.play()`.

3. **Canvas has no explicit `width`/`height` attributes**: The SDK renders to the canvas at its intrinsic resolution. Without explicit dimensions, the canvas defaults to 300x150, which the SDK may render into as a tiny surface. CSS sizing alone does not change the canvas drawing buffer. The SDK docs recommend using `source.setRenderSize()` or setting canvas dimensions properly.

---

## Plan

### 1. Fix `createMediaStreamSource` cameraType values
Change from `"front"/"back"` to match the SDK's documented pattern: pass the `facingMode` value directly (`"user"/"environment"`).

### 2. Remove any non-standard `session.play()` arguments
Ensure `sess.play()` is called without arguments, matching all SDK examples.

### 3. Do NOT set explicit canvas width/height or call `setRenderSize`
Per the SDK docs, Camera Kit automatically compensates for mobile orientation. Setting `setRenderSize` disables this. Let the SDK handle canvas buffer sizing. The CSS `object-fit: cover` handles display scaling.

### 4. Verify `loadLensGroups` return shape
The SDK returns `{ lenses: Lens[] }` from `loadLensGroups`. The current code accesses `result.lenses` which is correct.

### Technical details

**File: `src/components/CameraView.tsx`** (lines 95-97)
```typescript
// Change from:
const source = createMediaStreamSource(stream, {
  cameraType: facingMode === "user" ? "front" : "back",
} as any);

// To (matching SDK docs exactly):
const source = createMediaStreamSource(stream, {
  cameraType: facingMode === "user" ? "user" : "environment",
});
```

Remove the `as any` cast since the correct string values should match the SDK types.

Ensure line 106 is just `sess.play();` with no arguments.

These are minor but critical alignment fixes with the SDK's expected API surface. The core architecture (standard 1280x720 landscape request, CSS object-fit cover, Transform2D.MirrorX for front camera) is correct per the documentation.

