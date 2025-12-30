# Default VRM Model

This folder should contain your VRM model files.

## Getting a VRM Model

Since VRM models are large binary files, they are not included in the repository. Here are your options:

### Option 1: Download a Free Model

1. Visit [VRoid Hub](https://hub.vroid.com/en)
2. Sign up for a free account
3. Browse the models and find one you like
4. Download the VRM file
5. Place it in this folder as `default.vrm`

### Option 2: Create Your Own in VRoid Studio

1. Download [VRoid Studio](https://vroid.com/en/studio) (free)
2. Create your character:
   - For a gothic Lolita look like the default Ani:
     - Long blonde twin pigtails
     - Blue eyes  
     - Black frilly dress with lace
3. Export as VRM 1.0
4. Save as `default.vrm` in this folder

### Option 3: Use the Fallback

If no VRM is found, the app will automatically load a sample VRM from the pixiv/three-vrm project for demo purposes.

## Recommended Specifications

- Format: VRM 1.0 (preferred) or VRM 0.x
- File size: Under 50MB for best performance
- Blendshapes: Include standard expressions (happy, sad, angry, surprised)
- Mouth shapes: aa, ee, ih, oh, ou for lip sync

## Expression Mapping

The app looks for these blendshape names:
- `happy`, `joy` - Happy expression
- `sad`, `sorrow` - Sad expression
- `angry` - Angry expression
- `surprised` - Surprised expression
- `relaxed` - Relaxed/loving expression
- `blink` - Blinking
- `aa`, `ee`, `ih`, `oh`, `ou` - Mouth shapes for lip sync
