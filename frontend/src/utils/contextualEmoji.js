/**
 * Contextual Emoji Deterministic Resolver
 * Returns a high-context emoji based on destination, title, and activity context.
 * Used exclusively when a valid researched web image is unavailable or fails to load.
 */

export function getContextualEmoji(destination = '', title = '', category = '') {
  const text = `${destination || ''} ${title || ''} ${category || ''}`.toLowerCase().trim();

  // Beach / Coastal / Islands
  if (/\b(beach|coast|coastal|sea|ocean|gwadar|astola|ormara|pasni|clifton|sandspit|hawksbay|manora|seaview|port)\b/.test(text)) {
    return '🏖️';
  }

  // Lakes / Rivers / Waterfalls / Waters
  if (/\b(lake|river|waterfall|stream|water|saif|attabad|shangrila|lulusar|ratti|chitta|neelum|kunhar|swat river|indus|jehlum|hub|spoon lake|katora)\b/.test(text)) {
    return '🌊';
  }

  // Camping / Night Sky
  if (/\b(camp|camping|tent|bonfire|bivouac|stargazing|glamping)\b/.test(text)) {
    return '🏕️';
  }

  // Forest / Nature / Wildlife / Greenery / Parks / Trails
  if (/\b(nature|forest|jungle|national park|wildlife|margalla|pine|dunga gali|ayubia|nathia|shogran|siri paye|lush|flora|trail|green)\b/.test(text)) {
    return '🌲';
  }

  // Desert / Sand Dunes
  if (/\b(desert|sand|dune|cholistan|thar|katpana|sarfranga|cold desert)\b/.test(text)) {
    return '🏜️';
  }

  // Historical / Forts / Ruins / Heritage
  if (/\b(fort|baltit|altit|kharpocho|rohtas|derawar|taxila|mohenjo|heritage|museum|palace|ruins|ancient|monument|sharda|qila)\b/.test(text)) {
    return '🏛️';
  }

  // Cultural / Mosques / Shrines / Sacred
  if (/\b(mosque|masjid|faisal|badshahi|wazir|shrine|sufi|temple|church|gurdwara|spiritual|holy)\b/.test(text)) {
    return '🕌';
  }

  // Mountains / Peaks / Valleys / Passes / Glaciers
  if (/\b(mountain|peak|k2|broad peak|rakaposhi|pass|khunjerab|babusar|deosai|glacier|valley|valle|hunza|skardu|gilgit|nagar|chitral|shounter|naran|kaghan|swat|kalam|malam jabba|fairy meadows|conic|alpine)\b/.test(text)) {
    return '🏔️';
  }

  // General travel fallback
  return '✈️';
}
