import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, View, type ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { MEDIA_LIBRARY } from '@stampperk/shared';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

/** Map basename → canonical `/library/.../file.svg` when unique in catalog. */
const LIBRARY_BY_FILE = (() => {
  const map = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const item of MEDIA_LIBRARY) {
    const file = item.path.split('/').pop();
    if (!file) continue;
    if (ambiguous.has(file)) continue;
    if (map.has(file)) {
      map.delete(file);
      ambiguous.add(file);
      continue;
    }
    map.set(file, item.path);
  }
  return map;
})();

/**
 * Fix stale/wrong library folder paths (e.g. `/library/events/cake.svg`
 * → `/library/food-beverage/cake.svg`) using the current catalog.
 */
export function canonicalizeLibraryUrl(url: string): string {
  const match = url.match(/^(.*?)(\/library\/)([^/]+)\/([^/?#]+)([?#].*)?$/i);
  if (!match) return url;
  const [, prefix, , , file, suffix = ''] = match;
  const canonical = LIBRARY_BY_FILE.get(file);
  if (!canonical) return url;
  const currentPath = `/library/${match[3]}/${file}`;
  if (currentPath === canonical) return url;
  return `${prefix}${canonical}${suffix}`;
}

/** Rewrite localhost media URLs to the LAN API the app actually uses. */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  let next = url;
  if (next.startsWith('/')) {
    next = `${API_URL}${next}`;
  } else {
    try {
      const u = new URL(next);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const base = new URL(API_URL);
        u.protocol = base.protocol;
        u.host = base.host;
        next = u.toString();
      }
    } catch {
      /* keep as-is */
    }
  }
  return canonicalizeLibraryUrl(next);
}

export function isSvgUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.svg(\?|#|$)/i.test(url);
}

/**
 * Renders remote logos — PNG/JPEG via Image, library SVG via SvgUri
 * (RN Image cannot draw SVG, which caused blank white tiles).
 */
export function LogoImage({
  uri,
  size = 56,
  style,
  borderRadius,
}: {
  uri?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle | ViewStyle>;
  borderRadius?: number;
}) {
  const resolved = resolveMediaUrl(uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!uri || !resolved) return null;

  if (failed) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: borderRadius ?? 12,
            backgroundColor: '#E5E7EB',
          },
          style as StyleProp<ViewStyle>,
        ]}
      />
    );
  }

  if (isSvgUrl(resolved)) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: borderRadius ?? 12,
            overflow: 'hidden',
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          },
          style as StyleProp<ViewStyle>,
        ]}
      >
        <SvgUri
          uri={resolved}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolved }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: borderRadius ?? 12,
          backgroundColor: '#fff',
        },
        style as StyleProp<ImageStyle>,
      ]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
