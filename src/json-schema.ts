type JsonSchema = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
}

function matchesType(value: unknown, expected: unknown): boolean {
  const types = Array.isArray(expected) ? expected : [expected];
  return types.some((type) => {
    if (type === "integer") {
      return typeof value === "number" && Number.isInteger(value);
    }
    if (type === "number") {
      return typeof value === "number" && Number.isFinite(value);
    }
    if (type === "object") {
      return isRecord(value);
    }
    return valueType(value) === type;
  });
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateJsonSchema(
  value: unknown,
  schemaValue: unknown,
  options: { path?: string; rejectUnknownProperties?: boolean } = {}
): string[] {
  if (!isRecord(schemaValue)) {
    return [];
  }

  const schema = schemaValue as JsonSchema;
  const path = options.path ?? "value";
  const errors: string[] = [];

  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  for (const branch of allOf) {
    errors.push(...validateJsonSchema(value, branch, options));
  }

  for (const key of ["anyOf", "oneOf"] as const) {
    const branches = Array.isArray(schema[key]) ? schema[key] : [];
    if (branches.length > 0) {
      const branchErrors = branches.map((branch) => validateJsonSchema(value, branch, options));
      if (!branchErrors.some((result) => result.length === 0)) {
        errors.push(`${path} does not match any official ${key} schema`);
      }
    }
  }

  if (value === null && schema.nullable === true) {
    return errors;
  }

  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(
      `${path} must be ${Array.isArray(schema.type) ? schema.type.join(" or ") : String(schema.type)}; received ${valueType(value)}`
    );
    return errors;
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((allowed) => valuesEqual(allowed, value))) {
    errors.push(`${path} must be one of ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}`);
  }

  if (typeof value === "number") {
    const minimum = asFiniteNumber(schema.minimum);
    const maximum = asFiniteNumber(schema.maximum);
    const exclusiveMinimum = asFiniteNumber(schema.exclusiveMinimum);
    const exclusiveMaximum = asFiniteNumber(schema.exclusiveMaximum);
    const multipleOf = asFiniteNumber(schema.multipleOf);
    if (minimum != null && value < minimum) {
      errors.push(`${path} must be at least ${minimum}`);
    }
    if (maximum != null && value > maximum) {
      errors.push(`${path} must be at most ${maximum}`);
    }
    if (exclusiveMinimum != null && value <= exclusiveMinimum) {
      errors.push(`${path} must be greater than ${exclusiveMinimum}`);
    }
    if (exclusiveMaximum != null && value >= exclusiveMaximum) {
      errors.push(`${path} must be less than ${exclusiveMaximum}`);
    }
    if (multipleOf && Math.abs(value / multipleOf - Math.round(value / multipleOf)) > 1e-9) {
      errors.push(`${path} must be a multiple of ${multipleOf}`);
    }
  }

  if (typeof value === "string") {
    const minLength = asFiniteNumber(schema.minLength);
    const maxLength = asFiniteNumber(schema.maxLength);
    if (minLength != null && value.length < minLength) {
      errors.push(`${path} must contain at least ${minLength} character(s)`);
    }
    if (maxLength != null && value.length > maxLength) {
      errors.push(`${path} must contain at most ${maxLength} character(s)`);
    }
    if (typeof schema.pattern === "string") {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          errors.push(`${path} must match the official pattern ${schema.pattern}`);
        }
      } catch {
        // Do not block requests because an upstream schema contains an invalid regex.
      }
    }
    if (schema.format === "uri" && !isAbsoluteHttpUrl(value)) {
      errors.push(`${path} must be an absolute HTTP(S) URL`);
    }
  }

  if (Array.isArray(value)) {
    const minItems = asFiniteNumber(schema.minItems);
    const maxItems = asFiniteNumber(schema.maxItems);
    if (minItems != null && value.length < minItems) {
      errors.push(`${path} must contain at least ${minItems} item(s)`);
    }
    if (maxItems != null && value.length > maxItems) {
      errors.push(`${path} must contain at most ${maxItems} item(s)`);
    }
    if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
      errors.push(`${path} must contain unique items`);
    }
    value.forEach((item, index) => {
      errors.push(
        ...validateJsonSchema(item, schema.items, {
          ...options,
          path: `${path}[${index}]`
        })
      );
    });
  }

  if (isRecord(value)) {
    const hasDocumentedProperties = isRecord(schema.properties);
    const properties = hasDocumentedProperties ? schema.properties as Record<string, unknown> : {};
    const required = Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === "string")
      : [];
    for (const name of required) {
      if (value[name] === undefined || value[name] === null || value[name] === "") {
        errors.push(`${path}.${name} is required`);
      }
    }
    if (options.rejectUnknownProperties && hasDocumentedProperties) {
      for (const name of Object.keys(value)) {
        if (!(name in properties)) {
          errors.push(`${path}.${name} is not documented by the official schema`);
        }
      }
    }
    for (const [name, child] of Object.entries(value)) {
      if (name in properties && child !== undefined && child !== null) {
        errors.push(
          ...validateJsonSchema(child, properties[name], {
            ...options,
            path: `${path}.${name}`
          })
        );
      }
    }
  }

  return errors;
}
