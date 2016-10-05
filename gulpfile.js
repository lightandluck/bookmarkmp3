var gulp = require('gulp')
    connect = require('gulp-connect')

gulp.task('copy-html', _ => {
    return gulp.src('./src/index.html')
        .pipe(gulp.dest('./public/'))
        .pipe(connect.reload())
})

gulp.task('webserver', _ => {
    connect.server({
        root: 'public',
        livereload: true,
        port: 9002
    })
})

gulp.task('watch', _ => {
    gulp.watch('./src/index.html', ['copy-html'])
})

gulp.task('default', ['copy-html', 'webserver', 'watch'])
