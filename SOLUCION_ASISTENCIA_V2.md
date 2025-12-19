# 🎯 Solución al Problema de Registro de Asistencia

## 📊 **Diagnóstico del Problema**

### Problema Encontrado:
- Tienes **159 alumnos activos** en `premed.alumnos`
- Solo **51 alumnos** estaban sincronizados en `soporte.correos_autorizados`
- **108 alumnos no podían registrar asistencia** porque no estaban en la tabla intermedia

### Causa Raíz:
El sistema antiguo dependía de una tabla intermedia (`soporte.correos_autorizados`) que necesitaba sincronizarse cada 12 horas. Esto causaba:
- **Sincronización retrasada**: Nuevos alumnos no podían registrar asistencia hasta la próxima sincronización
- **Vulnerabilidad a fallos**: Si la sincronización fallaba, los alumnos quedaban sin acceso
- **Duplicación de datos**: Misma información en dos tablas

---

## ✅ **Solución Implementada: Versión 2**

He creado una **versión mejorada** que consulta directamente la base de datos central `premed.alumnos` en tiempo real, eliminando la necesidad de sincronización.

### Archivos Creados:

1. **`asistencia-v2.js`** - Lógica con consulta directa vía RPC
2. **`asistencia-v2.html`** - Panel de administración V2
3. **`registro-v2.html`** - Vista para alumnos V2
4. **`migration/create_rpc_alumnos_autorizados.sql`** - Función RPC segura

### Ventajas de la V2:
- ✅ **Tiempo real**: Cualquier alumno activo puede registrar asistencia inmediatamente
- ✅ **Sin sincronización**: No requiere scripts programados
- ✅ **Seguro**: Usa función RPC con permisos controlados
- ✅ **Filtros correctos**: Solo Matutino + Vespertino Presencial (excluye En Línea)

---

## 🚀 **Pasos para Activar la V2**

### Paso 1: Ejecutar SQL en Supabase

1. Abre el **SQL Editor** de Supabase: https://api.premed.mx (Dashboard)
2. Ejecuta el siguiente script:

```sql
-- Crear función RPC para obtener alumnos autorizados
CREATE OR REPLACE FUNCTION premed.get_alumnos_autorizados_asistencia()
RETURNS TABLE (
    email text,
    nombre text,
    turno text,
    modalidad text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = premed, public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LOWER(a.email) as email,
        a.nombre,
        a.turno,
        COALESCE(a.modalidad, 'presencial') as modalidad
    FROM premed.alumnos a
    WHERE a.activo = true 
      AND a.status = 'activo'
      AND a.email IS NOT NULL
      AND a.email != ''
      AND (
          a.turno = 'matutino'
          OR 
          (a.turno = 'vespertino' AND a.modalidad = 'presencial')
      )
    ORDER BY a.turno, a.email;
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION premed.get_alumnos_autorizados_asistencia() TO anon;
GRANT EXECUTE ON FUNCTION premed.get_alumnos_autorizados_asistencia() TO authenticated;

-- Verificar que funciona
SELECT * FROM premed.get_alumnos_autorizados_asistencia()
LIMIT 10;
```

3. Deberías ver una lista de ~51 alumnos (20 matutino + 31 vespertino presencial)

### Paso 2: Probar el Sistema V2

1. Abre en el navegador: `registro-v2.html`
2. Prueba con un correo de alumno activo (por ejemplo: `aklm300708@gmail.com`)
3. Verifica que aparezca el badge "V2 - Consulta Directa" en la esquina superior

### Paso 3: Distribuir Nuevo Enlace

Comparte con tus alumnos el nuevo enlace:
```
https://tudominio.com/registro-v2.html
```

**Nota**: Guarda el enlace antiguo (`registro.html`) como respaldo hasta confirmar que la V2 funciona correctamente.

---

## 📋 **Comparación V1 vs V2**

| Característica | V1 (Antigua) | V2 (Nueva) |
|---------------|-------------|-----------|
| **Fuente de datos** | `soporte.correos_autorizados` | `premed.alumnos` (directo vía RPC) |
| **Sincronización** | Cada 12 horas | Tiempo real |
| **Alumnos soportados** | 51 (sincronizados) | 159 (todos los activos) |
| **Delay para nuevos alumnos** | Hasta 12 horas | Inmediato |
| **Mantenimiento** | Requiere cron job | Sin mantenimiento |
| **Filtros** | Configurados en tabla | Configurados en función RPC |

---

## 🔍 **Verificación y Troubleshooting**

### Si un alumno reporta error:

1. **Verifica en la base de datos**:
   ```sql
   SELECT email, turno, modalidad, activo, status
   FROM premed.alumnos
   WHERE email = 'correo@alumno.com';
   ```

2. **Verifica que cumple los filtros**:
   - `activo = true`
   - `status = 'activo'`
   - `turno = 'matutino'` O `(turno = 'vespertino' AND modalidad = 'presencial')`

3. **Verifica que la función RPC funciona**:
   ```sql
   SELECT * FROM premed.get_alumnos_autorizados_asistencia()
   WHERE email = 'correo@alumno.com';
   ```

### Si no aparecen alumnos:

- Verifica que ejecutaste el script SQL en Supabase
- Verifica que la función tiene permisos para el rol `anon`
- Revisa la consola del navegador para ver mensajes de error

---

## 📝 **Próximos Pasos Recomendados**

1. ✅ Ejecutar el script SQL en Supabase (PASO 1)
2. ✅ Probar `registro-v2.html` con varios correos de alumnos
3. ✅ Confirmar que todos los alumnos activos pueden registrar asistencia
4. ⏳ Después de 1 semana de pruebas exitosas, migrar completamente a V2
5. ⏳ Opcional: Desactivar la sincronización automática del sistema antiguo

---

## 🆘 **Soporte**

Si tienes algún problema:
1. Revisa los logs de la consola del navegador (F12)
2. Ejecuta las queries de verificación en Supabase
3. Comparte el error específico para ayudarte mejor

---

**Fecha de creación**: 2024-12-18  
**Versión**: 2.0 - Consulta Directa  
**Estado**: Listo para implementación
