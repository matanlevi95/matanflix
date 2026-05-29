// Route an item to the right detail screen based on media_type.
export function openDetail(navigation, item) {
  const mediaType = item.media_type || (item.season !== undefined && item.season !== null ? "tv" : "movie");
  if (mediaType === "tv") {
    navigation.navigate("SeriesDetail", { id: item.tmdb_id, preview: item });
  } else {
    navigation.navigate("MovieDetail", { id: item.tmdb_id, preview: item });
  }
}
