function(doc) {
  if (doc.latitude) {
      emit(doc._id, {
          id:doc._id,
          rev : doc._rev,
          lat : doc.latitude,
          lon : doc.longitude, 
		  timestamp : doc.timestamp
      });
  }
};