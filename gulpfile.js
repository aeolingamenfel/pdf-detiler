const gulp = require("gulp");
const sass = require("gulp-sass");

const CSS_SRCS = ["src/electron/sass/*.scss", "src/electron/sass/**/*.scss"];

gulp.task("build-css", () => {
  return gulp.src(CSS_SRCS)
    .pipe(sass())
    .pipe(gulp.dest("src/electron/html/css/"));
});

gulp.task("default", gulp.series(["build-css"]));

gulp.task("watch", () => {
  gulp.watch(CSS_SRCS, gulp.series(["build-css"]));
});
