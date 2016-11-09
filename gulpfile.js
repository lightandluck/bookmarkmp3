var gulp = require('gulp'),
    connect = require('gulp-connect');

gulp.task('html', _ => {
    return gulp.src('./src/index.html')
        .pipe(gulp.dest('./public/'))
        .pipe(connect.reload());
});

gulp.task('js', _ => {
    return gulp.src('./src/*.js')
        .pipe(gulp.dest('./public/js/'))
        .pipe(connect.reload());
});

gulp.task('css', _ => {
    return gulp.src('./src/*.css')
        .pipe(gulp.dest('./public/css/'))
        .pipe(connect.reload());
});

gulp.task('webserver', _ => {
    connect.server({
        root: 'public',
        livereload: true,
        port: 9002
    });
});

gulp.task('watch', _ => {
    gulp.watch('./src/index.html', ['html']);
    gulp.watch('./src/*.js', ['js']);
    gulp.watch('./src/*.css', ['css']);
})

gulp.task('default', ['html', 'js', 'css', 'webserver', 'watch']);
