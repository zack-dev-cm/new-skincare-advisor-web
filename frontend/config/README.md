# Module Order Configuration

This directory contains configuration files for customizing the order of skincare and makeup modules in the routine display.

## How it Works

The system uses a two-tier approach for module ordering:

1. **Configuration File**: If `module-order.json` exists, it will be used to reorder modules
2. **API Fallback**: If no configuration file exists, the system uses the order from the API

## Files

- `module-order.json` - Active configuration file (create this to customize order)
- `module-order.example.json` - Example configuration with documentation
- `README.md` - This documentation file

## Setup

1. Copy the example file to create your configuration:
   ```bash
   cp public/config/module-order.example.json public/config/module-order.json
   ```

2. Edit `module-order.json` to customize the order of modules within each category

3. The system will automatically load and apply your configuration

## Configuration Structure

```json
{
  "skincare": [
    "Cleansing",
    "Tonic/Serum",
    "Pimple Patches",
    // ... other modules in desired order
  ],
  "makeup": [
    "Eye Makeup Remover",
    "Makeup Remover",
    "BB Cream",
    // ... other modules in desired order
  ]
}
```

## Available Modules

### Skincare Modules
- Cleansing
- Tonic/Serum
- Pimple Patches
- Eye Contour
- Hydration
- Lip Balm
- SPF
- Night Cream
- Face Mask/Scrub
- Eye Patches
- Lip Scrub
- Razor Disinfectant
- Body Cleanser
- Body Lotion
- Pure Oil
- Other

### Makeup Modules
- Eye Makeup Remover
- Makeup Remover
- BB Cream
- Concealer
- Foundation
- Powder
- Bronzer
- Blush
- Highlighter
- Fixing Spray
- Makeup Brush Disinfectant
- Beauty Blender Disinfectant

## How Module Matching Works

The system uses flexible matching to handle variations in module names:

- **Case-insensitive**: "cleansing" matches "Cleansing"
- **Flexible matching**: Handles variations in naming
- **Partial matching**: "Eye Makeup" matches "Eye Makeup Remover"

## Troubleshooting

### Configuration Not Applied
- Check browser console for error messages
- Ensure `module-order.json` is in `public/config/` directory
- Verify JSON syntax is valid

### Modules Not Reordered
- Check that module names in config match API module names
- Use browser dev tools to see which modules are being processed
- Check console logs for configuration loading status

### Fallback Behavior
If the configuration file is missing or invalid, the system will:
1. Log a warning to the console
2. Use the default order from the API
3. Continue functioning normally

## Development

To modify the configuration system:

1. **Configuration Loading**: `src/lib/moduleOrderConfig.ts`
2. **Order Application**: `src/components/steps/results_step.tsx`
3. **Default Values**: Defined in `moduleOrderConfig.ts`

## Example Customizations

### Prioritize Essential Steps
```json
{
  "skincare": [
    "Cleansing",
    "Hydration", 
    "SPF",
    "Night Cream",
    "Tonic/Serum",
    // ... other modules
  ]
}
```

### Group Similar Products
```json
{
  "makeup": [
    "Makeup Remover",
    "Eye Makeup Remover",
    "BB Cream",
    "Foundation", 
    "Concealer",
    // ... other modules
  ]
}
```
