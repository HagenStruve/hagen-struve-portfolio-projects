export function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

export function outsideBounds(entity, bounds, padding = 120) {
  return (
    entity.x < -padding ||
    entity.x > bounds.width + padding ||
    entity.y < -padding ||
    entity.y > bounds.height + padding
  );
}
