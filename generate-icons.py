#!pip install pillow
#!python generate-icons.py
#!/usr/bin/env python3
# ========================================
# ICON GENERATOR - RIVERS TOCHITO CLUB
# Genera todos los iconos optimizados desde una imagen base

# CONFIGURACIÓN
SOURCE = 'logo-source.png'  # Tu logo original (mínimo 512x512)
OUTPUT_DIR = './'

# Tamaños a generar
SIZES = [
    ('apple-180x180-icon.png', 180, False),
    ('android-192x192-icon.png', 192, True),
    ('android-512x512-icon.png', 512, True),
    ('favicon-32x32.png', 32, False),
    ('favicon-16x16.png', 16, False),
]

SAFE_ZONE = 0.8  # 10% padding para maskable icons
BG_COLOR = (10, 10, 10)  # Color de fondo (#0A0A0A)

def generate_icons():
    if not os.path.exists(SOURCE):
        print(f'❌ ERROR: No se encontró {SOURCE}')
        print('   Renombra tu logo principal como "logo-source.png"')
        return
    
    print('🎨 Generando iconos optimizados...\n')
    
    # Cargar imagen fuente
    img = Image.open(SOURCE).convert('RGBA')
    
    if img.width < 512 or img.height < 512:
        print(f'⚠️  ADVERTENCIA: La imagen es {img.width}x{img.height}')
        print('   Se recomienda mínimo 512x512 para mejor calidad\n')
    
    total_size = 0
    
    for name, size, maskable in SIZES:
        # Crear canvas
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        
        # Calcular tamaño de dibujo (con o sin safe zone)
        draw_size = int(size * SAFE_ZONE) if maskable else size
        offset = (size - draw_size) // 2
        
        # Redimensionar logo
        resized = img.resize((draw_size, draw_size), Image.Resampling.LANCZOS)
        
        if maskable:
            # Crear fondo sólido para maskable icons
            bg = Image.new('RGBA', (size, size), BG_COLOR + (255,))
            bg.paste(resized, (offset, offset), resized)
            output_path = os.path.join(OUTPUT_DIR, name)
            bg.save(output_path, 'PNG', optimize=True)
        else:
            # Mantener transparencia para iconos normales
            canvas.paste(resized, (offset, offset), resized)
            output_path = os.path.join(OUTPUT_DIR, name)
            canvas.save(output_path, 'PNG', optimize=True)
        
        file_size = os.path.getsize(output_path)
        total_size += file_size
        
        maskable_tag = '(Maskable)' if maskable else ''
        print(f'✅ {name} ({size}x{size}) {maskable_tag} - {file_size // 1024}KB')
    
    print(f'\n🎉 Todos los iconos generados!')
    print(f'📦 Peso total: {total_size // 1024}KB')
    print(f'📁 Ubicación: {os.path.abspath(OUTPUT_DIR)}\n')

if __name__ == '__main__':
    generate_icons()
